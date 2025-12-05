import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOrderNumber, calculateOrderTotal } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      pickup_date,
      pickup_time,
      customer_comment,
      items,
    } = body;

    // Validation des données
    if (!customer_name || !customer_phone || !pickup_date || !pickup_time) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Le panier est vide' },
        { status: 400 }
      );
    }

    // Calculer le total
    const total_ttc = calculateOrderTotal(items);

    // Obtenir l'incrément quotidien
    const created_date = new Date().toISOString().split('T')[0];
    
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('order_number')
      .eq('created_date', created_date)
      .order('created_at', { ascending: false })
      .limit(1);

    let dailyIncrement = 1;
    if (existingOrders && existingOrders.length > 0) {
      // Extraire l'incrément du dernier numéro de commande
      const lastOrderNumber = existingOrders[0].order_number;
      const lastIncrement = parseInt(lastOrderNumber.slice(-3));
      dailyIncrement = lastIncrement + 1;
    }

    // Générer le numéro de commande
    const order_number = generateOrderNumber(customer_name, dailyIncrement);

    // Créer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number,
        customer_name,
        customer_phone,
        pickup_date,
        pickup_time,
        customer_comment: customer_comment || null,
        status: 'A préparer',
        total_ttc,
        created_date,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Erreur création commande:', orderError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la commande' },
        { status: 500 }
      );
    }

    // Créer les lignes de commande
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price_ttc: item.unit_price_ttc,
      subtotal_ttc: item.quantity * item.unit_price_ttc,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Erreur création lignes commande:', itemsError);
      // Supprimer la commande si échec
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Erreur lors de la création des lignes de commande' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order_number: order.order_number,
      order_id: order.id,
    });
  } catch (error) {
    console.error('Erreur API orders:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
