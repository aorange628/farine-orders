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
  Square,
  Edit3
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';

// Fonction pour obtenir le lundi de la semaine en cours
function getMondayOfCurrentWeek(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = dimanche, 1 = lundi, etc.
  const diff = day === 0 ? -6 : 1 - day; // Si dimanche, revenir à lundi précédent
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

// Fonction pour ajouter des jours à une date
function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');
  
  // Filtres
  const [filters, setFilters] = useState({
  search: '',
  status: '',
  pickupDateFrom: getMondayOfCurrentWeek(),
  pickupDateTo: addDays(getMondayOfCurrentWeek(), 30),
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

  function openStatusChangeModal() {
    if (selectedOrders.size === 0) {
      alert('Veuillez sélectionner au moins une commande');
      return;
    }
    setSelectedNewStatus(statuses[0]?.name || '');
    setShowStatusModal(true);
  }

  async function applyStatusChange() {
    if (!selectedNewStatus) {
      alert('Veuillez sélectionner un statut');
      return;
    }

    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    
    const confirmMsg = `Êtes-vous sûr de vouloir changer le statut de ${selectedOrdersList.length} commande(s) vers "${selectedNewStatus}" ?\n\nCommandes concernées :\n${selectedOrdersList.map(o => `- ${o.order_number} (${o.customer_firstname} ${o.customer_name})`).slice(0, 10).join('\n')}${selectedOrdersList.length > 10 ? '\n...' : ''}`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      const orderIds = Array.from(selectedOrders);
      
      const { error } = await supabase
        .from('orders')
        .update({ status: selectedNewStatus })
        .in('id', orderIds);

      if (error) throw error;

      setShowStatusModal(false);
      await fetchOrders();
      alert(`✅ Statut de ${orderIds.length} commande(s) changé vers "${selectedNewStatus}"`);
    } catch (error) {
      console.error('Erreur changement statut:', error);
      alert('❌ Erreur lors du changement de statut');
    }
  }

  async function exportOrdersToExcel() {
    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    
    const data = selectedOrdersList.map(order => ({
      'N° Commande': order.order_number,
      'Prénom': order.customer_firstname || '',
      'Nom': order.customer_name,
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

    if (orderIds.length === 0) {
      alert('Veuillez sélectionner au moins une commande');
      return;
    }

    // Récupérer les lignes de commandes
    const { data: items } = await supabase
      .from('order_items')
      .select(`
        *,
        order:orders(order_number, customer_firstname, customer_name, pickup_date, pickup_time, customer_comment),
        product:products(libelle_caisse, unit_caisse, unit_commande, weight_per_unit)
      `)
      .in('order_id', orderIds)
      .order('order_id');

    if (!items || items.length === 0) {
      alert('Aucun produit dans les commandes sélectionnées');
      return;
    }

    // Créer un workbook ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Caisse');

    // Définir les colonnes
    worksheet.columns = [
      { header: 'N° Commande', key: 'orderNumber', width: 12 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Date enlèvement', key: 'pickupDate', width: 12 },
      { header: 'Heure enlèvement', key: 'pickupTime', width: 12 },
      { header: 'Produit', key: 'product', width: 30 },
      { header: 'Quantité caisse', key: 'quantityCaisse', width: 12 },
      { header: 'Unité caisse', key: 'unitCaisse', width: 12 },
      { header: 'Commentaire client', key: 'comment', width: 30 },
      { header: 'Unité commande', key: 'unitCommande', width: 15 },
      { header: 'Quantité commandée', key: 'quantityOriginal', width: 15 },
      { header: 'Poids unitaire (kg)', key: 'weight', width: 18 },
      { header: 'Sous-total', key: 'subtotal', width: 12 },
    ];

    // Style de l'en-tête
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    worksheet.getRow(1).alignment = { vertical: 'top', horizontal: 'left' };

    // Grouper les lignes par commande
    const orderGroups: { orderId: number; startRow: number; rows: any[] }[] = [];
    let currentOrderId: number | null = null;
    let currentGroup: any = null;

    items.forEach((item: any) => {
      const quantityOriginal = item.quantity;
      let quantityConverted = item.quantity;
      const unitCaisse = item.product?.unit_caisse || 'unité';
      const unitCommande = item.product?.unit_commande || 'unité';
      const weightPerUnit = item.product?.weight_per_unit;

      // Conversion
      if (unitCaisse === 'kg' && unitCommande !== 'kg' && weightPerUnit) {
        quantityConverted = Math.round(quantityConverted * weightPerUnit * 100) / 100;
      }

      const rowData = {
        orderNumber: item.order.order_number,
        client: `${item.order.customer_firstname || ''} ${item.order.customer_name}`.trim(),
        pickupDate: new Date(item.order.pickup_date).toLocaleDateString('fr-FR'),
        pickupTime: item.order.pickup_time,
        product: item.product?.libelle_caisse || item.product_name,
        quantityCaisse: quantityConverted,
        unitCaisse: unitCaisse,
        comment: item.order.customer_comment || '',
        unitCommande: unitCommande,
        quantityOriginal: quantityOriginal,
        weight: weightPerUnit || '-',
        subtotal: item.subtotal_ttc,
      };

      if (currentOrderId !== item.order_id) {
        // Nouvelle commande
        if (currentGroup) {
          orderGroups.push(currentGroup);
        }
        currentGroup = {
          orderId: item.order_id,
          startRow: worksheet.lastRow ? worksheet.lastRow.number + 1 : 2,
          rows: [rowData]
        };
        currentOrderId = item.order_id;
      } else {
        currentGroup.rows.push(rowData);
      }
    });

    if (currentGroup) {
      orderGroups.push(currentGroup);
    }

    // Ajouter les données et appliquer les styles
let colorIndex = 0;
const colors = ['FFFFFFFF', 'FFF0F0F0']; // Blanc, Gris clair

orderGroups.forEach(group => {
  const color = colors[colorIndex % 2];
  let firstRowNumber = 0;

  group.rows.forEach((rowData, index) => {
    const row = worksheet.addRow(rowData);
    
    // Capturer le numéro de la première ligne du groupe
    if (index === 0) {
      firstRowNumber = row.number;
    }

    // Appliquer la couleur de fond
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color }
      };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };
    });
  });

  // Fusionner les cellules APRÈS avoir ajouté toutes les lignes du groupe
  if (group.rows.length > 1) {
    const endRowNumber = firstRowNumber + group.rows.length - 1;
    worksheet.mergeCells(firstRowNumber, 1, endRowNumber, 1); // N° Commande
    worksheet.mergeCells(firstRowNumber, 2, endRowNumber, 2); // Client
    worksheet.mergeCells(firstRowNumber, 3, endRowNumber, 3); // Date
    worksheet.mergeCells(firstRowNumber, 4, endRowNumber, 4); // Heure
    worksheet.mergeCells(firstRowNumber, 8, endRowNumber, 8); // Commentaire
  }

  colorIndex++;
});
    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_caisse_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
  
 async function exportProductionReport() {
  const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));

  if (selectedOrdersList.length === 0) {
    alert('Veuillez sélectionner au moins une commande');
    return;
  }

  // FILTRER : Exclure les commandes "Annulé" et "En suspens"
  const validOrdersList = selectedOrdersList.filter(
    order => order.status !== 'Annulé' && order.status !== 'En suspens'
  );
  const excludedOrdersList = selectedOrdersList.filter(
    order => order.status === 'Annulé' || order.status === 'En suspens'
  );

  // Si aucune commande valide
  if (validOrdersList.length === 0) {
    alert('Aucune commande valide pour le rapport de production. Les commandes "Annulé" et "En suspens" sont exclues automatiquement.');
    return;
  }

  // Informer si des commandes ont été exclues
  if (excludedOrdersList.length > 0) {
    const confirmMsg = `${excludedOrdersList.length} commande(s) avec statut "Annulé" ou "En suspens" seront exclues du rapport.\n\n${validOrdersList.length} commande(s) valide(s) vont être incluses.\n\nContinuer ?`;
    if (!confirm(confirmMsg)) {
      return;
    }
  }

  const orderIds = validOrdersList.map(o => o.id);

  // Récupérer TOUS les produits avec leurs unités et poids
  const { data: allProducts } = await supabase
    .from('products')
    .select('id, name, libelle_drive, price_ttc, unit_commande, unit_production, weight_per_unit')
    .order('name');

  // VÉRIFICATION : Bloquer si un produit nécessite une conversion mais n'a pas de poids
  const productsNeedingConversion = allProducts?.filter(
    p => p.unit_production === 'kg' && p.unit_commande !== 'kg' && !p.weight_per_unit
  ) || [];

  if (productsNeedingConversion.length > 0) {
    const productNames = productsNeedingConversion.map(p => `- ${p.name}`).join('\n');
    alert(
      `❌ ERREUR : Impossible de générer le rapport de production.\n\n` +
      `Les produits suivants nécessitent une conversion (unité de production en kg) mais n'ont pas de poids unitaire défini :\n\n` +
      `${productNames}\n\n` +
      `Veuillez définir le poids unitaire (weight_per_unit) pour ces produits dans le back office.`
    );
    return;
  }

  // Récupérer les lignes de commandes
  const { data: items } = await supabase
    .from('order_items')
    .select('*, order:orders(pickup_date)')
    .in('order_id', orderIds);

  if (!items || items.length === 0) {
    alert('Aucun produit dans les commandes sélectionnées');
    return;
  }

  // Extraire toutes les dates uniques et les trier
  const datesSet = new Set<string>();
  items.forEach((item: any) => {
    datesSet.add(item.order.pickup_date);
  });
  const sortedDates = Array.from(datesSet).sort();

  // Générer TOUTES les dates entre la première et la dernière
  const allDates: string[] = [];
  if (sortedDates.length > 0) {
    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }
  }

  // Créer un Map pour agréger les quantités par produit et date
  const quantityMap = new Map<string, number>();
  items.forEach((item: any) => {
    const key = `${item.product_name}_${item.order.pickup_date}`;
    quantityMap.set(key, (quantityMap.get(key) || 0) + item.quantity);
  });

  // Construire le tableau croisé avec conversion des quantités
  const reportData: any[] = [];

  allProducts?.forEach(product => {
    const row: any = {
      'Libellé Drive': product.libelle_drive || product.name,
      'Prix TTC (€)': product.price_ttc,
      'Unité commande': product.unit_commande,
      'Poids unitaire (kg)': product.weight_per_unit || '-',
      'Unité production': product.unit_production,
    };

    // Ajouter les quantités pour chaque date avec conversion si nécessaire
    allDates.forEach(date => {
      const key = `${product.name}_${date}`;
      let quantity = quantityMap.get(key) || 0;
      
      // CONVERSION : Si unit_production = kg et unit_commande ≠ kg
      if (quantity > 0 && product.unit_production === 'kg' && product.unit_commande !== 'kg') {
        // Multiplier par le poids unitaire (déjà vérifié qu'il existe)
        quantity = quantity * (product.weight_per_unit || 0);
        // Arrondir à 2 décimales
        quantity = Math.round(quantity * 100) / 100;
      }
      
      const dateFormatted = new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      row[dateFormatted] = quantity || '';
    });

    reportData.push(row);
  });

  // Créer le fichier Excel
  const ws = XLSX.utils.json_to_sheet(reportData);
  
  // Ajuster la largeur des colonnes
  const colWidths = [
    { wch: 30 }, // Libellé Drive
    { wch: 12 }, // Prix TTC
    { wch: 15 }, // Unité commande
    { wch: 18 }, // Poids unitaire
    { wch: 15 }, // Unité production
  ];
  // Ajouter la largeur pour chaque date
  allDates.forEach(() => {
    colWidths.push({ wch: 12 });
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Production');
  
  const filename = `rapport_production_${sortedDates[0]}_${sortedDates[sortedDates.length - 1]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

  async function exportOrdersToPDF() {
    if (selectedOrders.size === 0) {
      alert('Veuillez sélectionner au moins une commande');
      return;
    }

    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    
    // FILTRER LES COMMANDES : EXCLURE "Annulé" ET "En suspens"
    const validOrdersList = selectedOrdersList.filter(
      order => order.status !== 'Annulé' && order.status !== 'En suspens'
    );
    const excludedOrdersList = selectedOrdersList.filter(
      order => order.status === 'Annulé' || order.status === 'En suspens'
    );

    // Si aucune commande valide
    if (validOrdersList.length === 0) {
      alert('Aucune commande valide à imprimer. Les commandes "Annulé" et "En suspens" sont exclues automatiquement.');
      return;
    }

    // Informer l'utilisateur si des commandes ont été exclues
    if (excludedOrdersList.length > 0) {
      const confirmMsg = `${excludedOrdersList.length} commande(s) avec statut "Annulé" ou "En suspens" ont été exclues automatiquement.\n\n${validOrdersList.length} commande(s) valide(s) vont être imprimées.\n\nContinuer ?`;
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    const orderIds = validOrdersList.map(o => o.id);

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
          product:products(unit_commande)
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
    const maxContentHeight = pageHeight - (2 * margin) - 10; // Garder 10mm pour le footer

    let currentYPos = margin;
    let pageNumber = 1;

    // Fonction pour calculer la hauteur d'une commande
    function calculateOrderHeight(order: any): number {
      let height = 0;
      
      // En-tête (N° commande + date)
      height += 11;
      
      // Infos client
      height += 5 + 7; // Titre + 1 ligne
      
      // Infos enlèvement
      height += 5 + 7; // Titre + 1 ligne
      
      // Tableau articles
      height += 6; // Titre
      height += 7; // En-tête tableau
      height += (order.order_items?.length || 0) * 5; // Lignes
      height += 5; // Séparation
      height += 10; // Total
      
      // Statut
      height += 6;
      
      // Commentaires
      if (order.customer_comment) {
        const commentLines = pdf.splitTextToSize(order.customer_comment, contentWidth - 6);
        height += 4 + (commentLines.length * 3.5) + 3;
      }
      if (order.farine_comment) {
        const commentLines = pdf.splitTextToSize(order.farine_comment, contentWidth - 6);
        height += 4 + (commentLines.length * 3.5) + 3;
      }
      
      // Marge de sécurité
      height += 10;
      
      return height;
    }

    // Fonction pour ajouter le footer
    function addFooter(pageNum: number, totalPages: number) {
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Page ${pageNum} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
      pdf.text(
        `Imprimé le ${new Date().toLocaleString('fr-FR')}`,
        margin,
        pageHeight - 8
      );
    }

    // Calculer le nombre total de pages (approximatif pour le footer)
    let totalPages = 1;
    let tempYPos = margin;
    ordersWithItems.forEach((order: any) => {
      const orderHeight = calculateOrderHeight(order);
      if (tempYPos + orderHeight > maxContentHeight + margin && tempYPos > margin) {
        totalPages++;
        tempYPos = margin;
      }
      tempYPos += orderHeight;
    });

    // Dessiner toutes les commandes
    ordersWithItems.forEach((order: any, orderIndex: number) => {
      const orderHeight = calculateOrderHeight(order);
      
      // Vérifier si on doit créer une nouvelle page
      // Exception : si c'est la première commande de la page, on la dessine même si elle dépasse
      if (currentYPos + orderHeight > maxContentHeight + margin && currentYPos > margin) {
        // Ajouter le footer sur la page actuelle
        addFooter(pageNumber, totalPages);
        
        // Nouvelle page
        pdf.addPage();
        pageNumber++;
        currentYPos = margin;
      }

      let yPos = currentYPos;

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

      // === INFORMATIONS CLIENT : PRÉNOM + NOM + TÉLÉPHONE SUR MÊME LIGNE ===
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CLIENT', margin, yPos);
      yPos += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const fullName = `${order.customer_firstname || ''} ${order.customer_name}`.trim();
      pdf.text(`Nom : ${fullName}`, margin + 3, yPos);
      
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
        const unit = item.product?.unit_commande || 'unité';
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

      // Ajouter un séparateur entre les commandes (sauf pour la dernière)
      if (orderIndex < ordersWithItems.length - 1) {
        yPos += 5;
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
      }

      // Mettre à jour la position Y pour la prochaine commande
      currentYPos = yPos;
    });

    // Ajouter le footer sur la dernière page
    addFooter(pageNumber, totalPages);

    // Télécharger le PDF
    const fileName = `commandes_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    // PLUS DE CHANGEMENT DE STATUT AUTOMATIQUE
    let message = `PDF généré avec succès ! ${validOrdersList.length} commande(s) imprimée(s)`;
    if (excludedOrdersList.length > 0) {
      message += `\n\n${excludedOrdersList.length} commande(s) exclue(s) (Annulé/En suspens)`;
    }
    alert(message);
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
                onChange={(e) => {
                  const newDateFrom = e.target.value;
                  // Si la date de fin est vide ou antérieure à la date de début, on la met à jour aussi
                  if (!filters.pickupDateTo || filters.pickupDateTo < newDateFrom) {
                    setFilters({ ...filters, pickupDateFrom: newDateFrom, pickupDateTo: newDateFrom });
                  } else {
                    setFilters({ ...filters, pickupDateFrom: newDateFrom });
                  }
                }}
                placeholder="Du"
              />
              <input
                type="date"
                value={filters.pickupDateTo}
                onChange={(e) => setFilters({ ...filters, pickupDateTo: e.target.value })}
                placeholder="Au"
                min={filters.pickupDateFrom}
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
              onClick={openStatusChangeModal}
              className="btn-primary text-sm flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <Edit3 className="w-4 h-4" />
              Changer le statut
            </button>
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
              Export Excel caisse
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
                    <td className="px-4 py-3 text-sm">{order.customer_firstname} {order.customer_name}</td>
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

      {/* Modal de changement de statut */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Changer le statut
            </h2>
            
            <p className="text-gray-600 mb-4">
              {selectedOrders.size} commande{selectedOrders.size > 1 ? 's' : ''} sélectionnée{selectedOrders.size > 1 ? 's' : ''}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau statut <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedNewStatus}
                onChange={(e) => setSelectedNewStatus(e.target.value)}
                className="w-full"
                required
              >
                {statuses.map(status => (
                  <option key={status.id} value={status.name}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={applyStatusChange}
                className="flex-1 btn-primary bg-orange-600 hover:bg-orange-700"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
