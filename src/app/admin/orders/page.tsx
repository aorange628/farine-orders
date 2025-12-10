'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Printer, 
  Eye, 
  RefreshCw,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  
  // Filtres
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    pickupDateFrom: '',
    pickupDateTo: '',
    createdDateFrom: '',
    createdDateTo: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Récupérer les statuts
      const { data: statusesData } = await supabase
        .from('order_statuses')
        .select('*')
        .order('sort_order');
      setStatuses(statusesData || []);

      // Récupérer les commandes
      await fetchOrders();
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders() {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (filters.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%`);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.pickupDateFrom) {
      query = query.gte('pickup_date', filters.pickupDateFrom);
    }
    if (filters.pickupDateTo) {
      query = query.lte('pickup_date', filters.pickupDateTo);
    }
    if (filters.createdDateFrom) {
      query = query.gte('created_date', filters.createdDateFrom);
    }
    if (filters.createdDateTo) {
      query = query.lte('created_date', filters.createdDateTo);
    }

    const { data, error } = await query;
    if (error) throw error;
    setOrders(data || []);
    setSelectedOrders(new Set());
  }

  function toggleSelectOrder(orderId: number) {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  }

  async function exportOrdersToExcel() {
    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    
    const data = selectedOrdersList.map(order => ({
      'N° Commande': order.order_number,
      'Client': order.customer_name,
      'Téléphone': order.customer_phone,
      'Date commande': new Date(order.created_at).toLocaleDateString('fr-FR'),
      'Heure commande': new Date(order.created_at).toLocaleTimeString('fr-FR'),
      'Date enlèvement': new Date(order.pickup_date).toLocaleDateString('fr-FR'),
      'Heure enlèvement': order.pickup_time,
      'Montant TTC': order.total_ttc,
      'Statut': order.status,
      'Commentaire client': order.customer_comment || '',
      'Commentaire FARINE': order.farine_comment || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Commandes');
    XLSX.writeFile(wb, `commandes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async function exportOrderItemsToExcel() {
    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    const orderIds = selectedOrdersList.map(o => o.id);

    // Récupérer les lignes de commandes
    const { data: items } = await supabase
      .from('order_items')
      .select('*, order:orders(order_number, customer_name, pickup_date)')
      .in('order_id', orderIds);

    const data = (items || []).map((item: any) => ({
      'N° Commande': item.order.order_number,
      'Client': item.order.customer_name,
      'Date enlèvement': new Date(item.order.pickup_date).toLocaleDateString('fr-FR'),
      'Produit': item.product_name,
      'Quantité': item.quantity,
      'Prix unitaire': item.unit_price_ttc,
      'Sous-total': item.subtotal_ttc,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lignes');
    XLSX.writeFile(wb, `lignes_commandes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async function exportProductionReport() {
    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    const orderIds = selectedOrdersList.map(o => o.id);

    // Récupérer les lignes de commandes avec produits
    const { data: items } = await supabase
      .from('order_items')
      .select('*, order:orders(pickup_date), product:products(category_id)')
      .in('order_id', orderIds);

    // Agréger par produit et date
    const aggregated = new Map();
    (items || []).forEach((item: any) => {
      const key = `${item.product_name}_${item.order.pickup_date}`;
      if (aggregated.has(key)) {
        aggregated.get(key).quantity += item.quantity;
      } else {
        aggregated.set(key, {
          product: item.product_name,
          date: new Date(item.order.pickup_date).toLocaleDateString('fr-FR'),
          quantity: item.quantity,
        });
      }
    });

    const data = Array.from(aggregated.values()).map(item => ({
      'Produit': item.product,
      'Date d\'enlèvement': item.date,
      'Quantité totale': item.quantity,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production');
    XLSX.writeFile(wb, `rapport_production_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  async function exportOrdersToPDF() {
    if (selectedOrders.size === 0) {
      alert('Veuillez sélectionner au moins une commande');
      return;
    }

    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    const orderIds = selectedOrdersList.map(o => o.id);

    // Récupérer les détails complets avec les produits pour avoir l'unité
    const { data: ordersWithItems } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          unit_price_ttc,
          subtotal_ttc,
          product:products(unit)
        )
      `)
      .in('id', orderIds)
      .order('pickup_date', { ascending: true });

    if (!ordersWithItems || ordersWithItems.length === 0) {
      alert('Erreur lors de la récupération des commandes');
      return;
    }

    // Créer le PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const contentWidth = pageWidth - (2 * margin);

    let totalPages = ordersWithItems.length;
    let currentPage = 0;

    ordersWithItems.forEach((order: any, orderIndex: number) => {
      if (orderIndex > 0) {
        pdf.addPage();
      }
      currentPage++;

      let yPos = margin;

      // === EN-TÊTE : N° COMMANDE + DATE COMMANDE SUR MÊME LIGNE ===
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPos, contentWidth, 8, 'F');
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`N° COMMANDE : ${order.order_number}`, margin + 2, yPos + 5.5);
      
      // Date de commande à droite
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(85, 85, 85);
      const createdDate = new Date(order.created_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Date commande : ${createdDate}`, pageWidth - margin - 2, yPos + 5.5, { align: 'right' });
      
      yPos += 11;

      // === INFORMATIONS CLIENT : NOM + TÉLÉPHONE SUR MÊME LIGNE ===
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CLIENT', margin, yPos);
      yPos += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Nom : ${order.customer_name}`, margin + 3, yPos);
      
      // Téléphone à droite sur la même ligne
      pdf.text(`Téléphone : ${order.customer_phone}`, margin + 100, yPos);
      yPos += 7;

      // === INFORMATIONS ENLÈVEMENT : DATE + HEURE SUR MÊME LIGNE ===
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ENLÈVEMENT', margin, yPos);
      yPos += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const pickupDate = new Date(order.pickup_date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.text(`Date : ${pickupDate}`, margin + 3, yPos);
      
      // Heure à droite sur la même ligne
      pdf.text(`Heure : ${order.pickup_time}`, margin + 120, yPos);
      yPos += 7;

      // === TABLEAU DES ARTICLES (COLONNES RÉORGANISÉES) ===
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ARTICLES À PRÉPARER', margin, yPos);
      yPos += 6;

      // En-tête du tableau : Qté | Unité | Produit | P.U. | Total
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, yPos, contentWi
