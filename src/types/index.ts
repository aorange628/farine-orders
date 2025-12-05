// Types pour la base de données FARINE

export interface Category {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface OrderStatus {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  color: string;
  created_at: string;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  unit: 'unité' | 'kg';
  price_ttc: number;
  description: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithCategory extends Product {
  category: Category;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  pickup_time: string;
  customer_comment: string | null;
  farine_comment: string | null;
  status: string;
  total_ttc: number;
  created_at: string;
  created_date: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price_ttc: number;
  subtotal_ttc: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

// Types pour les formulaires

export interface CreateProductInput {
  category_id: number;
  name: string;
  unit: 'unité' | 'kg';
  price_ttc: number;
  description?: string;
  photo_url?: string;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  pickup_time: string;
  customer_comment?: string;
  items: {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price_ttc: number;
  }[];
}

export interface UpdateOrderInput {
  customer_name?: string;
  customer_phone?: string;
  pickup_date?: string;
  pickup_time?: string;
  customer_comment?: string;
  farine_comment?: string;
  status?: string;
}

// Types pour les horaires
export interface ShopHours {
  [key: string]: {
    closed: boolean;
    open: string;
    close: string;
  };
}

// Types pour les rapports
export interface ProductionReport {
  product_name: string;
  category_name: string;
  total_quantity: number;
  unit: string;
  pickup_date: string;
}

export interface OrderSummary {
  order_number: string;
  customer_name: string;
  pickup_date: string;
  pickup_time: string;
  total_ttc: number;
  status: string;
  items_count: number;
}
