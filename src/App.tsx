import { useState, useEffect, useMemo } from 'react';
import { Product, Order, InventoryItem, CartItem, OrderStatus, ShopConfig, Category } from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_INVENTORY } from './data';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';
import AdminLogin from './components/AdminLogin';

export default function App() {
  // Navigation State
  const [view, setView] = useState<'customer' | 'admin'>('customer');

  // Core Persistent States
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('croffle_products_v8');
    let loaded: Product[] = [];
    if (saved) {
      try {
        loaded = JSON.parse(saved) as Product[];
      } catch (e) {
        loaded = INITIAL_PRODUCTS;
      }
    } else {
      loaded = INITIAL_PRODUCTS;
    }
    
    // Auto-migrate categories to 'ขนม' or 'เครื่องดื่ม' to support new classification perfectly
    return loaded.map(p => {
      let mappedCat = p.category as string;
      if (mappedCat === 'ครอฟเฟิล') {
        mappedCat = 'ขนม';
      } else if (['นม', 'ชา', 'กาแฟ', 'มัทฉะ', 'โซดา'].includes(mappedCat)) {
        mappedCat = 'เครื่องดื่ม';
      } else if (mappedCat !== 'ขนม' && mappedCat !== 'เครื่องดื่ม') {
        mappedCat = 'ขนม';
      }
      return { ...p, category: mappedCat as Category };
    });
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('croffle_orders_v8');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('croffle_cart_v8');
    if (saved) {
      try {
        return JSON.parse(saved) as CartItem[];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('croffle_inventory_v9');
    if (saved) {
      try {
        return JSON.parse(saved) as InventoryItem[];
      } catch (e) {
        return INITIAL_INVENTORY;
      }
    }
    return INITIAL_INVENTORY;
  });

  // Shop Schedule and Configuration State
  const [shopConfig, setShopConfig] = useState<ShopConfig>(() => {
    const saved = localStorage.getItem('croffle_shop_config_v1');
    if (saved) {
      try {
        return JSON.parse(saved) as ShopConfig;
      } catch (e) {
        // use default
      }
    }
    return {
      isOpen: true,
      autoSchedule: false,
      openTime: "08:00",
      closeTime: "20:00"
    };
  });

  // Visitor Tracking States
  const [totalViews, setTotalViews] = useState<number>(() => {
    const saved = localStorage.getItem('croffle_total_views_v1');
    return saved ? parseInt(saved, 10) : 348;
  });

  const [currentOnline, setCurrentOnline] = useState<number>(5);

  // Admin Credentials and login states
  const [adminUsername, setAdminUsername] = useState<string>(() => {
    return localStorage.getItem('croffle_admin_username_v1') || 'narongrit';
  });
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem('croffle_admin_password_v1') || '081144';
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Auto-logout when switching back to customer view
  useEffect(() => {
    if (view === 'customer') {
      setIsAdminLoggedIn(false);
    }
  }, [view]);

  // Persist admin password when changed
  const handleUpdateAdminPassword = (newPass: string) => {
    setAdminPassword(newPass);
    localStorage.setItem('croffle_admin_password_v1', newPass);
  };

  // Increment totalViews on mounting CustomerView
  useEffect(() => {
    if (view === 'customer') {
      setTotalViews(prev => prev + 1);
    }
  }, [view]);

  // Simulate active readers fluctuations (live feeling)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentOnline(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return Math.max(2, Math.min(12, next));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Time-based check tick
  const [currentTimeTick, setCurrentTimeTick] = useState<string>("");

  useEffect(() => {
    const updateTick = () => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeTick(`${hh}:${mm}`);
    };
    updateTick();
    const timer = setInterval(updateTick, 10000); // check every 10s
    return () => clearInterval(timer);
  }, []);

  // Calculate if shop is currently open
  const isShopOpen = useMemo(() => {
    if (!shopConfig.autoSchedule) {
      return shopConfig.isOpen;
    }
    if (!currentTimeTick) return shopConfig.isOpen;
    return currentTimeTick >= shopConfig.openTime && currentTimeTick <= shopConfig.closeTime;
  }, [shopConfig, currentTimeTick]);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('croffle_products_v8', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('croffle_orders_v8', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('croffle_cart_v8', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('croffle_inventory_v9', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('croffle_shop_config_v1', JSON.stringify(shopConfig));
  }, [shopConfig]);

  useEffect(() => {
    localStorage.setItem('croffle_total_views_v1', totalViews.toString());
  }, [totalViews]);

  // Handle Placing Order from Customer Side
  const handlePlaceOrder = (customerName: string, phone: string, roomNo: string, note: string) => {
    // Generate a sequential-style order number
    const maxId = orders.reduce((max, o) => {
      const num = parseInt(o.id.replace('#', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 4402);

    const newOrderId = `#${maxId + 1}`;

    const formattedItems = cart.map(item => {
      const toppingsPrice = item.selectedToppings.length > 1 ? (item.selectedToppings.length - 1) * 5 : 0;
      const optionsArray = [];
      if (item.selectedToppings.length > 0) {
        optionsArray.push(...item.selectedToppings.map((t, idx) => idx > 0 ? `${t.name} (+฿5)` : t.name));
      }
      if (item.note) optionsArray.push(`โน้ต: "${item.note}"`);

      return {
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price + toppingsPrice,
        optionsSummary: optionsArray.join(', ')
      };
    });

    const totalCalculatedPrice = cart.reduce((total, item) => {
      const toppingsCost = item.selectedToppings.length > 1 ? (item.selectedToppings.length - 1) * 5 : 0;
      return total + ((item.product.price + toppingsCost) * item.quantity);
    }, 0);

    const newOrder: Order = {
      id: newOrderId,
      customerName,
      phone,
      roomNo,
      items: formattedItems,
      totalPrice: totalCalculatedPrice,
      status: 'Pending',
      createdAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' วันนี้',
      note: note.trim() || undefined
    };

    setOrders(prev => [newOrder, ...prev]);

    // Simulate depleting stock of Fresh Milk/Croffle Dough when orders are made
    setInventory(prevInv => {
      return prevInv.map(inv => {
        // Deplete fresh milk if drinks are ordered
        if (inv.id === 'inv-1' && cart.some(c => c.product.category === 'นม' || c.product.category === 'มัทฉะ' || c.product.category === 'ชา')) {
          return { ...inv, status: 'low', stockText: "เหลือเพียง 1.2 ลิตร (ควรเติมสต็อกด่วน!)" };
        }
        // Deplete croffle dough if croffles are ordered
        if (inv.id === 'inv-2' && cart.some(c => c.product.category === 'ครอฟเฟิล')) {
          const count = cart.filter(c => c.product.category === 'ครอฟเฟิล').reduce((acc, c) => acc + c.quantity, 0);
          return { ...inv, status: 'low', stockText: `เหลือต่ำกว่าเกณฑ์ (${15 - count} ชิ้น)` };
        }
        return inv;
      });
    });
  };

  // Factory reset all states back to initial screenshot mockup defaults
  const handleResetDefaults = () => {
    localStorage.clear();
    setProducts(INITIAL_PRODUCTS);
    setOrders(INITIAL_ORDERS);
    setCart([]);
    setInventory(INITIAL_INVENTORY);
  };

  return (
    <div className="w-full min-h-screen bg-[#fcf5f2] font-sans antialiased select-none flex flex-col items-center justify-center md:py-8 py-0">
      {view === 'customer' ? (
        <CustomerView 
          products={products}
          orders={orders}
          cart={cart}
          setCart={setCart}
          onPlaceOrder={handlePlaceOrder}
          onSwitchToAdmin={() => setView('admin')}
          isShopOpen={isShopOpen}
          shopConfig={shopConfig}
        />
      ) : !isAdminLoggedIn ? (
        <AdminLogin 
          onLoginSuccess={() => setIsAdminLoggedIn(true)}
          onBack={() => setView('customer')}
          correctUsername={adminUsername}
          correctPassword={adminPassword}
        />
      ) : (
        <AdminView 
          products={products}
          setProducts={setProducts}
          orders={orders}
          setOrders={setOrders}
          inventory={inventory}
          setInventory={setInventory}
          onSwitchToCustomer={() => setView('customer')}
          onResetDefaults={handleResetDefaults}
          shopConfig={shopConfig}
          setShopConfig={setShopConfig}
          totalViews={totalViews}
          currentOnline={currentOnline}
          isShopOpen={isShopOpen}
          adminUsername={adminUsername}
          adminPassword={adminPassword}
          onUpdateAdminPassword={handleUpdateAdminPassword}
        />
      )}
    </div>
  );
}
