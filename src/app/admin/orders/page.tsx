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
      pdf.rect(margin, yPos, contentWidth, 7, 'F');
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Qté', margin + 5, yPos + 4.5, { align: 'center' });
      pdf.text('Unité', margin + 20, yPos + 4.5, { align: 'center' });
      pdf.text('Produit', margin + 40, yPos + 4.5);
      pdf.text('P.U.', margin + 145, yPos + 4.5);
      pdf.text('Total', margin + 175, yPos + 4.5);
      
      yPos += 7;

      // Lignes du tableau
      pdf.setFont('helvetica', 'normal');
      (order.order_items || []).forEach((item: any, index: number) => {
        // Ligne alternée
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPos, contentWidth, 5, 'F');
        }

        pdf.setFontSize(8);
        
        // Quantité (centrée)
        pdf.text(item.quantity.toString(), margin + 5, yPos + 3.5, { align: 'center' });
        
        // Unité (centrée)
        const unit = item.product?.unit || 'unité';
        pdf.text(unit, margin + 20, yPos + 3.5, { align: 'center' });
        
        // Produit (tronqué si trop long)
        let productName = item.product_name;
        const maxProductNameWidth = 95;
        if (pdf.getTextWidth(productName) > maxProductNameWidth) {
          while (pdf.getTextWidth(productName + '...') > maxProductNameWidth && productName.length > 0) {
            productName = productName.slice(0, -1);
          }
          productName += '...';
        }
        pdf.text(productName, margin + 40, yPos + 3.5);
        
        // Prix unitaire
        pdf.text(`${item.unit_price_ttc.toFixed(2)} €`, margin + 145, yPos + 3.5);
        
        // Total
        pdf.text(`${item.subtotal_ttc.toFixed(2)} €`, margin + 175, yPos + 3.5);
        
        yPos += 5;
      });

      // Ligne de séparation
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      // === TOTAL (NOIR/GRAS SUR FOND BLANC) ===
      pdf.setDrawColor(51, 51, 51);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 1;
      pdf.line(margin, yPos + 7, pageWidth - margin, yPos + 7);
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`TOTAL TTC : ${order.total_ttc.toFixed(2)} €`, pageWidth - margin - 3, yPos + 5, { align: 'right' });
      
      yPos += 10;

      // === STATUT ===
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`STATUT : `, margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(order.status, margin + 17, yPos);
      yPos += 6;

      // === COMMENTAIRES ===
      if (order.customer_comment) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('COMMENTAIRE CLIENT :', margin, yPos);
        yPos += 4;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const commentLines = pdf.splitTextToSize(order.customer_comment, contentWidth - 6);
        pdf.text(commentLines, margin + 3, yPos);
        yPos += (commentLines.length * 3.5) + 3;
      }

      if (order.farine_comment) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('NOTES FARINE :', margin, yPos);
        yPos += 4;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const commentLines = pdf.splitTextToSize(order.farine_comment, contentWidth - 6);
        pdf.text(commentLines, margin + 3, yPos);
        yPos += (commentLines.length * 3.5) + 3;
      }

      // Espace pour notes manuscrites si on a de la place
      if (yPos < pageHeight - 35) {
        yPos += 3;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('NOTES :', margin, yPos);
        yPos += 4;
        
        // Lignes pour écriture
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.1);
        for (let i = 0; i < 3; i++) {
          if (yPos + (i * 6) < pageHeight - 15) {
            pdf.line(margin, yPos + (i * 6), pageWidth - margin, yPos + (i * 6));
          }
        }
      }

      // === NUMÉRO DE PAGE EN BAS ===
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Page ${currentPage} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      // Date d'impression
      pdf.text(
        `Imprimé le ${new Date().toLocaleString('fr-FR')}`,
        margin,
        pageHeight - 8
      );
    });

    // Télécharger le PDF
    const fileName = `commandes_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  }

  const filteredOrders = orders;
  const allSelected = selectedOrders.size === orders.length && orders.length > 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farine-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
          <p className="text-gray-600 mt-2">
            {orders.length} commande{orders.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-farine-green" />
          <h2 className="text-lg font-bold text-gray-900">Filtres</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recherche (nom ou n°)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Nom ou numéro..."
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tous les statuts</option>
              {statuses.map(status => (
                <option key={status.id} value={status.name}>{status.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date d'enlèvement
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.pickupDateFrom}
                onChange={(e) => setFilters({ ...filters, pickupDateFrom: e.target.value })}
                placeholder="Du"
              />
              <input
                type="date"
                value={filters.pickupDateTo}
                onChange={(e) => setFilters({ ...filters, pickupDateTo: e.target.value })}
                placeholder="Au"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={fetchOrders} className="btn-primary">
            Appliquer les filtres
          </button>
          <button
            onClick={() => {
              setFilters({
                search: '',
                status: '',
                pickupDateFrom: '',
                pickupDateTo: '',
                createdDateFrom: '',
                createdDateTo: '',
              });
              fetchOrders();
            }}
            className="btn-secondary"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Actions de masse */}
      {selectedOrders.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-3">
            {selectedOrders.size} commande{selectedOrders.size > 1 ? 's' : ''} sélectionnée{selectedOrders.size > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportOrdersToExcel}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel (liste)
            </button>
            <button
              onClick={exportOrderItemsToExcel}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel (lignes)
            </button>
            <button
              onClick={exportProductionReport}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Rapport production
            </button>
            <button
              onClick={exportOrdersToPDF}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer PDF
            </button>
          </div>
        </div>
      )}

      {/* Table des commandes */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-farine-beige">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-farine-green-light rounded"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-5 h-5 text-farine-green" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">N° Commande</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Client</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date enlèvement</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Montant</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Statut</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map(order => {
                const status = statuses.find(s => s.name === order.status);
                const isSelected = selectedOrders.has(order.id);
                
                return (
                  <tr key={order.id} className={`hover:bg-farine-beige transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelectOrder(order.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-farine-green" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{order.order_number}</td>
                    <td className="px-4 py-3 text-sm">{order.customer_name}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(order.pickup_date).toLocaleDateString('fr-FR')} à {order.pickup_time}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatPrice(order.total_ttc)}</td>
                    <td className="px-4 py-3">
                      {status && (
                        <span
                          className="inline-block px-3 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: status.color + '33',
                            color: status.color,
                          }}
                        >
                          {order.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-farine-green hover:text-farine-green-dark"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">Aucune commande trouvée</p>
        </div>
      )}
    </div>
  );
}
