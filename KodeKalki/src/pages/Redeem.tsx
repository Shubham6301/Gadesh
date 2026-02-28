import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Coins, Gift, Truck, MapPin, Phone, User, CheckCircle, Package, Clock, XCircle, ChevronDown, ChevronUp, AlertCircle, X, Calendar } from 'lucide-react';import { API_URL } from "../config/api";
import confetti from 'canvas-confetti';
// ============================================
// 🔢 VALIDATION HELPER FUNCTIONS
// ============================================
const validateFullName = (name: string): string | null => {
  if (!name.trim()) return 'Full name is required';
  if (name.trim().length < 3) return 'Name must be at least 3 characters';
  return null;
};

const validatePhone = (phone: string): string | null => {
  if (!phone) return 'Phone number is required';
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) return 'Phone must be exactly 10 digits';
  return null;
};

const validatePincode = (pincode: string): string | null => {
  if (!pincode) return 'PIN code is required';
  const pincodeRegex = /^[0-9]{6}$/;
  if (!pincodeRegex.test(pincode)) return 'PIN code must be exactly 6 digits';
  return null;
};

const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value.trim()) return `${fieldName} is required`;
  return null;
};

const validateQuantity = (qty: number): string | null => {
  if (qty < 1) return 'Quantity must be at least 1';
  if (qty > 10) return 'Quantity cannot exceed 10';
  if (!Number.isInteger(qty)) return 'Quantity must be a whole number';
  return null;
};

// ============================================
// 🎉 CONFETTI FUNCTION
// ============================================
const triggerConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};

interface RedeemItem {
  _id: string;
  name: string;
  description: string;
  coinsCost: number;
  category: string;
  imageUrl: string;
  inStock: boolean;
  popularity: number;
}

interface RedeemOrder {
  itemId: string;
  quantity: number;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

interface MyOrder {
  _id: string;
  itemId: {
    _id: string;
    name: string;
    imageUrl: string;
    coinsCost: number;
    description: string;
  };
  quantity: number;
  totalCost: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  orderDate: string;
  trackingNumber?: string;
  cancelledBy?: 'admin' | 'user';
  cancelReason?: string;
  cancelledAt?: string;
  deliveredAt?: string;
   predictedDeliveryDate?: string;
}

interface ValidationErrors {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  quantity?: string;
}

// ============================================
// 🏆 SUCCESS POPUP COMPONENT
// ============================================
interface SuccessPopupProps {
  itemName: string;
  quantity: number;
  totalCost: number;
  onViewOrders: () => void;
  onClose: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ itemName, quantity, totalCost, onViewOrders, onClose }) => {
  const { isDark } = useTheme();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100] animate-fadeIn">
      <div className={`${isDark ? 'bg-gray-800/90 backdrop-blur-xl' : 'bg-white/90 backdrop-blur-xl'} rounded-2xl max-w-md w-full shadow-2xl border border-white/20 animate-scaleIn`}>
        <div className="p-8 text-center">
          {/* Animated Success Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-lg">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          
          {/* Title */}
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
            🎉 Congratulations!
          </h2>
          
          {/* Success Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your order has been placed successfully!
          </p>
          
          {/* Order Details */}
          <div className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-sm rounded-lg p-5 mb-6 border border-blue-100 dark:border-blue-800">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Item:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{itemName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quantity:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{quantity}</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Coins:</span>
                <div className="flex items-center">
                  <Coins className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{totalCost}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onViewOrders}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center transform hover:scale-[1.02]"
            >
              <Package className="h-5 w-5 mr-2" />
              View My Orders
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all duration-200"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

const Redeem: React.FC = () => {
  const { user, token, updateCoins } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [items, setItems] = useState<RedeemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RedeemItem | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'store' | 'myorders'>('store');
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successOrderDetails, setSuccessOrderDetails] = useState<{ itemName: string; quantity: number; totalCost: number } | null>(null);
  const hasTriggeredConfetti = useRef(false);
  
  // NEW: Cancellation states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);   // ✅ moved inside component
  
  const [deliveryAddress, setDeliveryAddress] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const categories = ['all', 'electronics', 'clothing', 'books', 'accessories', 'vouchers'];

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    fetchRedeemItems();
    fetchMyOrders();
  }, [user, token, navigate]);

  const fetchMyOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await axios.get(`${API_URL}/redeem/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMyOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchRedeemItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/redeem/items`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching redeem items:', error);
      // Fallback dummy data
      setItems([
        {
          _id: "694196b14698b6182a86cb8e",
          name: "Coding T-Shirt",
          description: "Premium quality cotton t-shirt with coding quotes and programming humor",
          coinsCost: 652,
          category: "clothing",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765908013/tshirt_dm8py0.png",
          inStock: true,
          popularity: 95,
        },
        {
          _id: "694196b14698b6182a86cb8f",
          name: "Programming Mug",
          description: "Coffee mug for programmers with funny coding jokes",
          coinsCost: 350,
          category: "accessories",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765908394/Gemini_Generated_Image_z81p4ez81p4ez81p_hzp6ve.png",
          inStock: true,
          popularity: 88,
        },
        {
          _id: "694196b14698b6182a86cb90",
          name: "Bluetooth Headphones",
          description: "Wireless headphones perfect for coding sessions",
          coinsCost: 1200,
          category: "electronics",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765908269/Gemini_Generated_Image_ydws23ydws23ydws_wjaqhw.png",
          inStock: true,
          popularity: 92,
        },
        {
          _id: "694196b14698b6182a86cb91",
          name: "Algorithm Book",
          description: "Advanced algorithms and data structures book",
          coinsCost: 250,
          category: "books",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765902008/Gemini_Generated_Image_j7xx1qj7xx1qj7xx_jc9zts.png",
          inStock: true,
          popularity: 85,
        },
        {
          _id: "694196b14698b6182a86cb92",
          name: "Amazon Gift Card ($52)",
          description: "$25 Amazon gift card for your shopping needs - Digital delivery",
          coinsCost: 2000,
          category: "vouchers",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765902009/Gemini_Generated_Image_wpyxc6wpyxc6wpyx_upovv2.png",
          inStock: true,
          popularity: 98,
        },
        {
          _id: "694196b14698b6182a86cb93",
          name: "Mechanical Keyboard",
          description: "RGB mechanical keyboard for better coding experience",
          coinsCost: 1500,
          category: "electronics",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765908614/Gemini_Generated_Image_kokhiskokhiskokh_nnblhk.png",
          inStock: false,
          popularity: 90,
        },
        {
          _id: "694196b14698b6182a86cb94",
          name: "Coding Hoodie",
          description: "Comfortable hoodie with developer-themed designs",
          coinsCost: 1500,
          category: "clothing",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765908718/Gemini_Generated_Image_6z7u3j6z7u3j6z7u_lwfx5c.png",
          inStock: true,
          popularity: 87,
        },
        {
          _id: "694196b14698b6182a86cb95",
          name: "Mouse Pad",
          description: "Large gaming mouse pad with programming motifs",
          coinsCost: 200,
          category: "accessories",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765908874/Gemini_Generated_Image_v7rhulv7rhulv7rh_vbgsk1.png",
          inStock: true,
          popularity: 75,
        },
        {
          _id: "6941a1c378e05d80e779d70d",
          name: "WaterBottle",
          description: "Durable water bottle ideal for daily use during coding sessions",
          coinsCost: 1100,
          category: "accessories",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765902008/Gemini_Generated_Image_ltxvnltxvnltxvnl_sp4qsm.png",
          inStock: true,
          popularity: 88,
        },
        {
          _id: "6941a1c378e05d80e779d70e",
          name: "CAP",
          description: "Stylish cap with developer-themed design",
          coinsCost: 350,
          category: "clothing",
          imageUrl: "https://res.cloudinary.com/dwh8yiung/image/upload/v1765902010/Gemini_Generated_Image_jmwxl9jmwxl9jmwx_lyuozf.png",
          inStock: true,
          popularity: 90,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 🎨 IMPROVED REDEEM CLICK HANDLER
  // ============================================
  const handleRedeemClick = (item: RedeemItem) => {
    // Reset validation errors
    setValidationErrors({});
    
    // Validate item stock
    if (!item.inStock) {
      return; // Button should be disabled, but double-check
    }
    
    // Validate user has enough coins
    const totalCost = item.coinsCost * quantity;
    if (!user || (user.coins || 0) < totalCost) {
      return; // Button should be disabled, but double-check
    }

    setSelectedItem(item);
    setQuantity(1); // Reset to 1 when opening modal
    setShowRedeemModal(true);
  };

  // ============================================
  // 🔢 QUANTITY CHANGE HANDLER WITH VALIDATION
  // ============================================
  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value);
    
    if (isNaN(numValue) || value === '') {
      setQuantity(1);
      setValidationErrors(prev => ({ ...prev, quantity: 'Invalid quantity' }));
      return;
    }
    
    const error = validateQuantity(numValue);
    if (error) {
      setValidationErrors(prev => ({ ...prev, quantity: error }));
    } else {
      setValidationErrors(prev => {
        const { quantity, ...rest } = prev;
        return rest;
      });
    }
    
    setQuantity(Math.max(1, Math.min(10, numValue)));
  };

  // ============================================
  // 📍 ADDRESS FIELD HANDLERS WITH VALIDATION
  // ============================================
  const handleAddressFieldChange = (field: keyof typeof deliveryAddress, value: string) => {
    // Special handling for phone and pincode (numbers only)
    if (field === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 10);
      setDeliveryAddress(prev => ({ ...prev, [field]: numericValue }));
      
      const error = validatePhone(numericValue);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      } else {
        setValidationErrors(prev => {
          const { [field]: _, ...rest } = prev;
          return rest;
        });
      }
      return;
    }
    
    if (field === 'pincode') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6);
      setDeliveryAddress(prev => ({ ...prev, [field]: numericValue }));
      
      const error = validatePincode(numericValue);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      } else {
        setValidationErrors(prev => {
          const { [field]: _, ...rest } = prev;
          return rest;
        });
      }
      return;
    }
    
    // Standard field handling
    setDeliveryAddress(prev => ({ ...prev, [field]: value }));
    
    // Validate based on field type
    let error: string | null = null;
    if (field === 'fullName') {
      error = validateFullName(value);
    } else if (field === 'address' || field === 'city' || field === 'state') {
      error = validateRequired(value, field.charAt(0).toUpperCase() + field.slice(1));
    }
    
    if (error) {
      setValidationErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // ============================================
  // 🚫 VALIDATE ALL FIELDS BEFORE SUBMIT
  // ============================================
  const validateAllFields = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Validate quantity
    const qtyError = validateQuantity(quantity);
    if (qtyError) errors.quantity = qtyError;
    
    // Validate address fields
    const nameError = validateFullName(deliveryAddress.fullName);
    if (nameError) errors.fullName = nameError;
    
    const phoneError = validatePhone(deliveryAddress.phone);
    if (phoneError) errors.phone = phoneError;
    
    const addressError = validateRequired(deliveryAddress.address, 'Address');
    if (addressError) errors.address = addressError;
    
    const cityError = validateRequired(deliveryAddress.city, 'City');
    if (cityError) errors.city = cityError;
    
    const stateError = validateRequired(deliveryAddress.state, 'State');
    if (stateError) errors.state = stateError;
    
    const pincodeError = validatePincode(deliveryAddress.pincode);
    if (pincodeError) errors.pincode = pincodeError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================
  // ✅ IMPROVED SUBMIT HANDLER WITH SUCCESS POPUP
  // ============================================
  const handleRedeemSubmit = async () => {
    if (!selectedItem || !user || !token) return;

    // Validate all fields
    if (!validateAllFields()) {
      return;
    }

    const totalCost = selectedItem.coinsCost * quantity;
    if ((user.coins || 0) < totalCost) {
      setValidationErrors(prev => ({ 
        ...prev, 
        quantity: `Insufficient coins! You need ${totalCost} but have ${user.coins || 0}` 
      }));
      return;
    }

    setSubmitting(true);
    hasTriggeredConfetti.current = false; // Reset confetti flag

    try {
      const orderData: RedeemOrder = {
        itemId: selectedItem._id,
        quantity,
        deliveryAddress
      };

      await axios.post(`${API_URL}/redeem/order`, orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update user coins
      const newCoinBalance = (user.coins || 0) - totalCost;
      updateCoins(newCoinBalance);

      // Refresh orders list
      await fetchMyOrders();

      // Store success details
      setSuccessOrderDetails({
        itemName: selectedItem.name,
        quantity,
        totalCost
      });

      // Close redemption modal
      setShowRedeemModal(false);

      // Trigger confetti only once
      if (!hasTriggeredConfetti.current) {
        triggerConfetti();
        hasTriggeredConfetti.current = true;
      }

      // Show success popup
      setShowSuccessPopup(true);

      // Reset form
      setSelectedItem(null);
      setQuantity(1);
      setDeliveryAddress({
        fullName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
      });
      setValidationErrors({});

    } catch (error: any) {
      console.error('Error processing redemption:', error);
      setValidationErrors(prev => ({
        ...prev,
        quantity: error.response?.data?.error || 'Failed to process redemption. Please try again.'
      }));
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // 🚫 NEW: CANCEL ORDER HANDLER
  // ============================================
  const handleCancelOrder = async () => {
    if (!cancellingOrderId || !cancelReason.trim()) {
      setValidationErrors(prev => ({ 
        ...prev, 
        quantity: 'Please provide a cancellation reason' 
      }));
      return;
    }

    setCancelSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/redeem/cancel-order`,
        {
          orderId: cancellingOrderId,
          reason: cancelReason.trim()
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local state
      setMyOrders(myOrders.map(order =>
        order._id === cancellingOrderId
          ? { 
              ...order, 
              status: 'cancelled' as const,
              cancelReason: cancelReason.trim(),
              cancelledAt: new Date().toISOString()
            }
          : order
      ));

      // Update user coins
      if (response.data.currentCoins !== undefined) {
  updateCoins(response.data.currentCoins);
}

      // Close modal and reset
      setShowCancelModal(false);
      setCancellingOrderId(null);
      setCancelReason('');
      setValidationErrors({});

      // Show success popup
      setShowCancelSuccess(true);
    } catch (error: any) {
      alert(`Failed to cancel order: ${error.response?.data?.error || error.message}`);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const getCategoryColor = (category: string) => {
    const colors = {
      electronics: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      clothing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      books: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      accessories: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      vouchers: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading redemption store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      {/* AI Cosmic Animation for Dark Mode */}
      {isDark && (
        <>
          <style>{`
            @keyframes ai-neural-pulse {
              0%, 100% {
                transform: translateX(0px) translateY(0px) scale(1) rotate(0deg);
                opacity: 0.6;
              }
              25% {
                transform: translateX(20px) translateY(-15px) scale(1.1) rotate(90deg);
                opacity: 1;
              }
              50% {
                transform: translateX(-10px) translateY(20px) scale(0.9) rotate(180deg);
                opacity: 0.8;
              }
              75% {
                transform: translateX(30px) translateY(5px) scale(1.05) rotate(270deg);
                opacity: 0.9;
              }
            }
            @keyframes ai-data-stream {
              0% { transform: translateY(-100px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.8; }
              90% { opacity: 0.8; }
              100% { transform: translateY(100vh) translateX(25px) rotate(360deg); opacity: 0; }
            }
            @keyframes neural-network {
              0%, 100% { 
                opacity: 0.4;
                transform: scale(1) rotate(0deg);
              }
              50% { 
                opacity: 1;
                transform: scale(1.1) rotate(180deg);
              }
            }
            @keyframes ai-constellation {
              0% { transform: rotate(0deg) translateX(120px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
            }
            @keyframes quantum-field {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
                transform: scale(1.1) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(139, 92, 246, 0.1), rgba(16, 185, 129, 0.1));
                transform: scale(0.9) rotate(240deg);
              }
            }
            @keyframes ai-circuit-flow {
              0% { transform: translateX(-100px) translateY(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.7; }
              90% { opacity: 0.7; }
              100% { transform: translateX(100vw) translateY(20px) rotate(360deg); opacity: 0; }
            }
            .ai-neural-pulse {
              animation: ai-neural-pulse 7s ease-in-out infinite;
            }
            .ai-data-stream {
              animation: ai-data-stream 9s linear infinite;
            }
            .neural-network {
              animation: neural-network 3s ease-in-out infinite;
            }
            .ai-constellation {
              animation: ai-constellation 25s linear infinite;
            }
            .quantum-field {
              animation: quantum-field 14s ease-in-out infinite;
            }
            .ai-circuit-flow {
              animation: ai-circuit-flow 10s linear infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Quantum field backgrounds */}
            <div className="absolute top-1/4 left-1/5 w-96 h-96 quantum-field rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 quantum-field rounded-full blur-3xl" style={{ animationDelay: '5s' }}></div>
            <div className="absolute top-2/3 left-1/3 w-64 h-64 quantum-field rounded-full blur-2xl" style={{ animationDelay: '10s' }}></div>
            
            {/* AI Neural Network Nodes */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={`neural-node-${i}`}
                className={`neural-network absolute ${
                  i % 7 === 0 ? 'w-2 h-2 bg-blue-400 rounded-full' :
                  i % 7 === 1 ? 'w-1.5 h-1.5 bg-purple-400 rounded-full' :
                  i % 7 === 2 ? 'w-2 h-2 bg-cyan-400 rounded-full' :
                  i % 7 === 3 ? 'w-1 h-1 bg-green-400 rounded-full' :
                  i % 7 === 4 ? 'w-1.5 h-1.5 bg-teal-400 rounded-full' :
                  i % 7 === 5 ? 'w-2 h-2 bg-indigo-400 rounded-full' :
                  'w-1.5 h-1.5 bg-violet-400 rounded-full'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              />
            ))}
            
            {/* AI Data Streams */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`data-stream-${i}`}
                className={`ai-data-stream absolute w-1 h-6 ${
                  i % 4 === 0 ? 'bg-gradient-to-b from-blue-400 to-transparent' :
                  i % 4 === 1 ? 'bg-gradient-to-b from-purple-400 to-transparent' :
                  i % 4 === 2 ? 'bg-gradient-to-b from-cyan-400 to-transparent' :
                  'bg-gradient-to-b from-green-400 to-transparent'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 9}s`,
                  animationDuration: `${9 + Math.random() * 4}s`,
                }}
              />
            ))}

            {/* AI Circuit Flow */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`circuit-flow-${i}`}
                className={`ai-circuit-flow absolute w-1 h-1 ${
                  i % 4 === 0 ? 'bg-blue-400' :
                  i % 4 === 1 ? 'bg-purple-400' :
                  i % 4 === 2 ? 'bg-cyan-400' : 'bg-green-400'
                } rounded-full`}
                style={{
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${10 + Math.random() * 5}s`,
                }}
              />
            ))}

            {/* AI Constellation Orbiters */}
            <div className="absolute top-1/4 left-1/4 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-blue-400 rounded-full neural-network"></div>
            </div>
            <div className="absolute top-3/4 right-1/3 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-purple-400 rounded-full neural-network" style={{ animationDelay: '8s' }}></div>
            </div>
            <div className="absolute top-1/2 left-2/3 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-cyan-400 rounded-full neural-network" style={{ animationDelay: '12s' }}></div>
            </div>

            {/* AI Neural Pulse Elements */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`ai-pulse-${i}`}
                className={`ai-neural-pulse absolute ${
                  i % 4 === 0 ? 'w-4 h-4 bg-gradient-to-br from-blue-500/40 to-cyan-500/40' :
                  i % 4 === 1 ? 'w-3 h-3 bg-gradient-to-br from-purple-500/40 to-violet-500/40' :
                  i % 4 === 2 ? 'w-3.5 h-3.5 bg-gradient-to-br from-green-500/40 to-teal-500/40' :
                  'w-4 h-4 bg-gradient-to-br from-indigo-500/40 to-purple-500/40'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${7 + Math.random() * 3}s`,
                  animationDelay: `${Math.random() * 7}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Light Mode AI Animation */}
      {!isDark && (
        <>
          <style>{`
            @keyframes light-ai-float {
              0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(0deg);
                opacity: 0.5;
              }
              25% {
                transform: translateY(-10px) translateX(12px) rotate(90deg);
                opacity: 0.8;
              }
              50% {
                transform: translateY(6px) translateX(-8px) rotate(180deg);
                opacity: 1;
              }
              75% {
                transform: translateY(-15px) translateX(18px) rotate(270deg);
                opacity: 0.6;
              }
            }
            @keyframes light-data-particle {
              0% { transform: translateY(-30px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.6; }
              90% { opacity: 0.6; }
              100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
            }
            @keyframes ai-aurora {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12));
                transform: scale(1.05) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(139, 92, 246, 0.12), rgba(16, 185, 129, 0.12));
                transform: scale(0.95) rotate(240deg);
              }
            }
            @keyframes light-neural-glow {
              0%, 100% { 
                box-shadow: 0 0 10px rgba(59, 130, 246, 0.3), 0 0 20px rgba(147, 51, 234, 0.2);
                opacity: 0.5; 
              }
              50% { 
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(147, 51, 234, 0.4);
                opacity: 1; 
              }
            }
            .light-ai-float {
              animation: light-ai-float 6s ease-in-out infinite;
            }
            .light-data-particle {
              animation: light-data-particle 8s linear infinite;
            }
            .ai-aurora {
              animation: ai-aurora 11s ease-in-out infinite;
            }
            .light-neural-glow {
              animation: light-neural-glow 2.8s ease-in-out infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* AI Aurora backgrounds */}
            <div className="absolute top-1/5 left-1/3 w-96 h-96 ai-aurora rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/5 w-80 h-80 ai-aurora rounded-full blur-3xl" style={{ animationDelay: '4s' }}></div>
            <div className="absolute top-2/3 left-1/6 w-64 h-64 ai-aurora rounded-full blur-2xl" style={{ animationDelay: '8s' }}></div>
            
            {/* Light Neural Network Nodes */}
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={`light-neural-${i}`}
                className={`light-neural-glow absolute ${
                  i % 6 === 0 ? 'w-2 h-2 bg-blue-400/60 rounded-full' :
                  i % 6 === 1 ? 'w-1.5 h-1.5 bg-purple-400/60 rounded-full' :
                  i % 6 === 2 ? 'w-2 h-2 bg-cyan-400/60 rounded-full' :
                  i % 6 === 3 ? 'w-1 h-1 bg-green-400/60 rounded-full' :
                  i % 6 === 4 ? 'w-1.5 h-1.5 bg-teal-400/60 rounded-full' :
                  'w-2 h-2 bg-indigo-400/60 rounded-full'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.8}s`,
                  animationDuration: `${2.8 + Math.random() * 1.5}s`,
                }}
              />
            ))}
            
            {/* Light Data Particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`light-data-${i}`}
                className={`light-data-particle absolute w-1 h-1 ${
                  i % 5 === 0 ? 'bg-blue-300/50' :
                  i % 5 === 1 ? 'bg-purple-300/50' :
                  i % 5 === 2 ? 'bg-cyan-300/50' :
                  i % 5 === 3 ? 'bg-green-300/50' : 'bg-teal-300/50'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 8}s`,
                  animationDuration: `${8 + Math.random() * 3}s`,
                }}
              />
            ))}

            {/* Light AI Float Elements */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`light-ai-${i}`}
                className={`light-ai-float absolute ${
                  i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/50 to-purple-200/50' :
                  i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-cyan-200/50 to-teal-200/50' :
                  i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-green-200/50 to-blue-200/50' :
                  'w-2.5 h-2.5 bg-gradient-to-br from-indigo-200/50 to-violet-200/50'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${6 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 6}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Premium Header */}
          <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-1">
            <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg mr-4">
                    <Gift className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Coin Redemption Store
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Exchange your hard-earned coins for amazing rewards!
                    </p>
                  </div>
                </div>
                <div className="flex items-center bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 px-6 py-3 rounded-xl border border-yellow-200 dark:border-yellow-700 shadow-lg">
                  <Coins className="h-7 w-7 text-yellow-600 dark:text-yellow-400 mr-2" />
                  <div>
                    <span className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{user?.coins || 0}</span>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400 ml-1">coins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex space-x-2 mb-8">
            <button
              onClick={() => setActiveTab('store')}
              className={`flex items-center px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                activeTab === 'store'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Gift className="h-4 w-4 mr-2" />
              Redemption Store
            </button>
            <button
              onClick={() => setActiveTab('myorders')}
              className={`flex items-center px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                activeTab === 'myorders'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Package className="h-4 w-4 mr-2" />
              My Orders
              {myOrders.length > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'myorders' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                }`}>
                  {myOrders.length}
                </span>
              )}
            </button>
          </div>

          {/* My Orders Tab */}
{/* My Orders Tab */}
{activeTab === 'myorders' && (
  <div>
    {ordersLoading ? (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    ) : myOrders.length === 0 ? (
      <div className="text-center py-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700">
        <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No orders yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Go to the store and redeem something awesome!</p>
        <button
          onClick={() => setActiveTab('store')}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full text-sm font-medium transition-colors shadow-md"
        >
          Browse Store
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        {myOrders.map((order) => {
          const steps = [
            { key: 'pending', label: 'Order Placed', icon: '📦', desc: 'Your order has been received' },
            { key: 'processing', label: 'Processing', icon: '⚙️', desc: 'We are preparing your order' },
            { key: 'shipped', label: 'Shipped', icon: '🚚', desc: 'Order is on its way to you' },
            { key: 'delivered', label: 'Delivered', icon: '✅', desc: 'Order delivered successfully' },
          ];
          const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
          const currentIdx = order.status === 'cancelled' ? -1 : statusOrder.indexOf(order.status);
          const isExpanded = expandedOrder === order._id;
          const canCancel = order.status === 'pending' || order.status === 'processing';
          
          return (
            <div
              key={order._id}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Order Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
              >
                <div className="flex items-center space-x-4">
                  {order.itemId?.imageUrl && (
                    <img
                      src={order.itemId.imageUrl}
                      alt={order.itemId?.name}
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {order.itemId?.name || 'Item'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Qty: {order.quantity} &bull; 🪙 {order.totalCost} coins
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Ordered: {new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {order.status === 'cancelled' ? (
                    <span className="flex items-center px-3 py-1.5 bg-red-100/80 dark:bg-red-900/30 backdrop-blur-sm text-red-700 dark:text-red-300 rounded-full text-xs font-semibold border border-red-200 dark:border-red-800">
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Cancelled
                    </span>
                  ) : (
                    <span className={`flex items-center px-3 py-1.5 backdrop-blur-sm rounded-full text-xs font-semibold border ${
                      order.status === 'delivered'
                        ? 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                        : order.status === 'shipped'
                        ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        : order.status === 'processing'
                        ? 'bg-yellow-100/80 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                    }`}>
                      {order.status === 'delivered' && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                      {order.status === 'shipped' && <Truck className="h-3.5 w-3.5 mr-1" />}
                      {order.status === 'processing' && <Clock className="h-3.5 w-3.5 mr-1" />}
                      {order.status === 'pending' && <Package className="h-3.5 w-3.5 mr-1" />}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-gray-400" />
                    : <ChevronDown className="h-4 w-4 text-gray-400" />
                  }
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-5">
                  {/* Progress Tracker */}
                  {order.status !== 'cancelled' && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Order Progress</p>
                      <div className="relative">
                        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700 z-0">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${currentIdx === 0 ? 0 : currentIdx >= 3 ? 100 : (currentIdx / 3) * 100}%` }}
                          />
                        </div>
                        <div className="relative z-10 flex justify-between">
                          {steps.map((step, idx) => {
                            const isDone = idx <= currentIdx;
                            const isActive = idx === currentIdx;
                            return (
                              <div key={step.key} className="flex flex-col items-center w-1/4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-300 ${
                                  isDone ? 'bg-blue-600 border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                                } ${isActive ? 'ring-4 ring-blue-200 dark:ring-blue-900' : ''}`}>
                                  <span className={isDone ? 'grayscale-0' : 'grayscale opacity-40'}>
                                    {step.icon}
                                  </span>
                                </div>
                                <p className={`mt-2 text-xs font-medium text-center ${
                                  isDone ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'
                                }`}>
                                  {step.label}
                                </p>
                                {isActive && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-0.5 max-w-[80px]">
                                    {step.desc}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancel Order Button */}
                  {canCancel && (
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancellingOrderId(order._id);
                          setShowCancelModal(true);
                        }}
                        className="flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors border border-red-200 dark:border-red-800"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Order
                      </button>
                    </div>
                  )}

                  {/* Predicted Delivery Date Display */}
                  {order.status !== 'cancelled' && order.status !== 'delivered' && order.predictedDeliveryDate && (
                    <div className="flex items-center p-3 bg-purple-50/80 dark:bg-purple-900/20 backdrop-blur-sm rounded-lg border border-purple-200 dark:border-purple-800">
                      <Calendar className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300">📅 Estimated Delivery</p>
                        <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
                          {new Date(order.predictedDeliveryDate).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          Expected arrival date
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tracking Number */}
                  {order.trackingNumber && (
                    <div className="flex items-center p-3 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm rounded-lg border border-blue-200 dark:border-blue-800">
                      <Truck className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Tracking Number</p>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{order.trackingNumber}</p>
                      </div>
                    </div>
                  )}

                  {/* Delivered Date */}
                  {order.status === 'delivered' && (
                    <div className="flex items-center p-3 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-green-700 dark:text-green-300">Delivered On</p>
                        <p className="text-sm font-bold text-green-900 dark:text-green-100">
                          {order.deliveredAt
                            ? new Date(order.deliveredAt).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })
                            : 'Date not recorded (Contact support if issue persists)'
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Delivery Address */}
                  <div className="p-3 bg-gray-50/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-lg">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      Delivery Address
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.deliveryAddress?.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.deliveryAddress?.phone}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {order.deliveryAddress?.address}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

          {/* Store Tab Content */}
          {activeTab === 'store' && (
            <>
              {/* Premium Category Filter */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-3">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 capitalize backdrop-blur-sm border ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30 scale-105'
                          : 'bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {category === 'all' ? 'All Items' : category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => {
                  const userCoins = user?.coins || 0;
                  const hasEnoughCoins = userCoins >= item.coinsCost;
                  const isRedeemable = item.inStock && hasEnoughCoins;
                  
                  return (
                    <div
                      key={item._id}
                      className={`group relative transition-all duration-500 ${!item.inStock ? 'opacity-75' : ''}`}
                      style={{
                        borderRadius: '24px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transform: 'translateY(0)',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px) scale(1.02)';
                        (e.currentTarget as HTMLElement).style.boxShadow = isDark
                          ? '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(139,92,246,0.55)'
                          : '0 24px 60px rgba(120,80,220,0.18), 0 0 0 1.5px rgba(139,92,246,0.45)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                        (e.currentTarget as HTMLElement).style.boxShadow = isDark
                          ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)'
                          : '0 8px 32px rgba(100,80,200,0.08), inset 0 1px 0 rgba(255,255,255,0.9)';
                      }}
                    >
                      {/* Gradient border wrapper */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: '-1px',
                          borderRadius: '25px',
                          background: 'linear-gradient(135deg, #a78bfa, #60a5fa, #34d399)',
                          opacity: 0,
                          transition: 'opacity 0.4s',
                          zIndex: 0,
                          pointerEvents: 'none',
                        }}
                        className="group-hover:opacity-100"
                      />

                      {/* Card inner */}
                      <div
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          borderRadius: '23px',
                          overflow: 'hidden',
                          background: isDark
                            ? 'linear-gradient(145deg, rgba(22,17,50,0.97), rgba(15,12,35,0.99))'
                            : 'rgba(255,255,255,0.88)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          boxShadow: isDark
                            ? 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.3)'
                            : 'inset 0 1px 0 rgba(255,255,255,1)',
                          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(210,200,255,0.45)',
                        }}
                      >
                        {/* Image Container */}
                        <div style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden' }}>
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                            className="group-hover:scale-110"
                          />

                          {/* Bottom image fade */}
                          <div style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            background: isDark
                              ? 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(15,12,35,0.75) 100%)'
                              : 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(255,255,255,0.5) 100%)',
                          }} />

                          {/* Hover gloss */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%)',
                          }} />

                          {/* Category Badge */}
                          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5 }}>
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-md ${getCategoryColor(item.category)}`}
                              style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                            >
                              {item.category}
                            </span>
                          </div>

                          {/* Wishlist Heart Button */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              const btn = e.currentTarget;
                              const svg = btn.querySelector('svg');
                              const isWishlisted = btn.getAttribute('data-wishlisted') === 'true';
                              if (!isWishlisted) {
                                btn.setAttribute('data-wishlisted', 'true');
                                btn.style.background = 'rgba(239,68,68,0.9)';
                                btn.style.boxShadow = '0 4px 16px rgba(239,68,68,0.45)';
                                btn.style.transform = 'scale(1.2)';
                                if (svg) svg.style.fill = 'white';
                                setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);
                              } else {
                                btn.setAttribute('data-wishlisted', 'false');
                                btn.style.background = 'rgba(0,0,0,0.30)';
                                btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                                if (svg) svg.style.fill = 'rgba(255,255,255,0.85)';
                              }
                            }}
                            data-wishlisted="false"
                            style={{
                              position: 'absolute', top: 12, right: 12, zIndex: 5,
                              width: 34, height: 34, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer',
                              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                              background: 'rgba(0,0,0,0.30)',
                              border: '1px solid rgba(255,255,255,0.18)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                            onMouseEnter={e => {
                              const el = e.currentTarget as HTMLElement;
                              if (el.getAttribute('data-wishlisted') !== 'true') {
                                el.style.background = 'rgba(239,68,68,0.75)';
                                el.style.transform = 'scale(1.1)';
                              }
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget as HTMLElement;
                              if (el.getAttribute('data-wishlisted') !== 'true') {
                                el.style.background = 'rgba(0,0,0,0.30)';
                                el.style.transform = 'scale(1)';
                              }
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)" xmlns="http://www.w3.org/2000/svg" style={{ transition: 'fill 0.2s' }}>
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          </button>

                          {/* Out of Stock Badge */}
                          {!item.inStock && (
                            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 5 }}>
                              <span style={{
                                padding: '5px 12px', borderRadius: '100px',
                                fontSize: 11, fontWeight: 700, color: 'white',
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.92), rgba(185,28,28,0.92))',
                                backdropFilter: 'blur(8px)',
                              }}>
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '18px 20px 20px', position: 'relative', zIndex: 10 }}>

                          {/* Title */}
                          <h3 style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 17, fontWeight: 700,
                            marginBottom: 6, lineHeight: 1.25,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            background: isDark
                              ? 'linear-gradient(135deg, #e2e8f0, #c4b5fd)'
                              : 'linear-gradient(135deg, #2d1f6e, #5b21b6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}>
                            {item.name}
                          </h3>

                          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2" style={{ minHeight: 40, lineHeight: 1.6 }}>
                            {item.description}
                          </p>

                          {/* Divider */}
                          <div style={{
                            height: 1, marginBottom: 14,
                            background: isDark
                              ? 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)'
                              : 'linear-gradient(90deg, transparent, rgba(139,92,246,0.18), transparent)',
                          }} />

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Price Pill */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '8px 14px', borderRadius: 14, flexShrink: 0,
                              background: isDark
                                ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))'
                                : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                              border: isDark ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(251,191,36,0.35)',
                              boxShadow: '0 2px 10px rgba(245,158,11,0.1)',
                            }}>
                              <Coins className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              <span style={{
                                fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em',
                                color: isDark ? '#fbbf24' : '#92400e',
                              }}>{item.coinsCost}</span>
                              <span style={{
                                fontSize: 11, fontWeight: 500,
                                color: isDark ? '#d97706' : '#b45309',
                              }}>coins</span>
                            </div>

                            {/* Redeem Button */}
                            <button
                              onClick={() => handleRedeemClick(item)}
                              disabled={!isRedeemable}
                              style={isRedeemable ? {
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '10px 16px', borderRadius: 14, border: 'none',
                                fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer',
                                letterSpacing: '0.02em',
                                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 60%, #5b21b6 100%)',
                                boxShadow: '0 4px 16px rgba(109,40,217,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              } : {
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '10px 16px', borderRadius: 14, border: 'none',
                                fontSize: 13, fontWeight: 700, cursor: 'not-allowed',
                                background: isDark ? 'rgba(75,85,99,0.4)' : 'rgba(229,231,235,0.9)',
                                color: isDark ? 'rgba(107,114,128,1)' : 'rgba(156,163,175,1)',
                              }}
                              onMouseEnter={e => {
                                if (isRedeemable) {
                                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(109,40,217,0.45), inset 0 1px 0 rgba(255,255,255,0.25)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (isRedeemable) {
                                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(109,40,217,0.35), inset 0 1px 0 rgba(255,255,255,0.2)';
                                }
                              }}
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Redeem
                            </button>
                          </div>

                          {/* Insufficient Coins Warning */}
                          {item.inStock && !hasEnoughCoins && (
                            <div style={{
                              marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                              fontSize: 11.5, fontWeight: 500, padding: '8px 12px', borderRadius: 10,
                              background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(254,242,242,1)',
                              border: isDark ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(254,202,202,1)',
                              color: isDark ? 'rgba(252,165,165,1)' : 'rgba(185,28,28,1)',
                            }}>
                              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>Need {item.coinsCost - userCoins} more coins to redeem</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700">
                  <Gift className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No items found</h3>
                  <p className="text-gray-600 dark:text-gray-400">Try selecting a different category</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Premium Redemption Modal */}
        {showRedeemModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 animate-scaleIn">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                    <Gift className="h-6 w-6 mr-2 text-purple-500" />
                    Redeem {selectedItem.name}
                  </h3>
                  <button
                    onClick={() => setShowRedeemModal(false)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                
                {/* Item Preview */}
                <div className="mb-6">
                  <div className="w-full aspect-[2/1] overflow-hidden rounded-xl mb-3 border border-gray-200 dark:border-gray-700">
                    <img
                      src={selectedItem.imageUrl}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  
                  {/* Quantity Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity (1-10):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      className={`w-full px-4 py-2.5 border ${
                        validationErrors.quantity 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                      } rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium`}
                    />
                    {validationErrors.quantity && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {validationErrors.quantity}
                      </p>
                    )}
                  </div>
                  
                  {/* Total Cost Display */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-sm rounded-lg border border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Cost:</span>
                    <div className="flex items-center">
                      <Coins className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {selectedItem.coinsCost * quantity}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">coins</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Form */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <Truck className="h-5 w-5 mr-2 text-green-500" />
                    Delivery Address
                  </h4>
                  
                  {/* Full Name & Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={deliveryAddress.fullName}
                          onChange={(e) => handleAddressFieldChange('fullName', e.target.value)}
                          className={`w-full pl-10 pr-3 py-2 border ${
                            validationErrors.fullName 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          } rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                          placeholder=" "
                        />
                      </div>
                      {validationErrors.fullName && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.fullName}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={deliveryAddress.phone}
                          onChange={(e) => handleAddressFieldChange('phone', e.target.value)}
                          className={`w-full pl-10 pr-3 py-2 border ${
                            validationErrors.phone 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          } rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                          placeholder=" "
                          maxLength={10}
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <textarea
                        value={deliveryAddress.address}
                        onChange={(e) => handleAddressFieldChange('address', e.target.value)}
                        rows={3}
                        className={`w-full pl-10 pr-3 py-2 border ${
                          validationErrors.address 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        } rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none`}
                        placeholder=" "
                      />
                    </div>
                    {validationErrors.address && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.address}</p>
                    )}
                  </div>

                  {/* City, State, PIN */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.city}
                        onChange={(e) => handleAddressFieldChange('city', e.target.value)}
                        className={`w-full px-3 py-2 border ${
                          validationErrors.city 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        } rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                        placeholder=" "
                      />
                      {validationErrors.city && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.city}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.state}
                        onChange={(e) => handleAddressFieldChange('state', e.target.value)}
                        className={`w-full px-3 py-2 border ${
                          validationErrors.state 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        } rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                        placeholder=" "
                      />
                      {validationErrors.state && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.state}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        PIN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.pincode}
                        onChange={(e) => handleAddressFieldChange('pincode', e.target.value)}
                        className={`w-full px-3 py-2 border ${
                          validationErrors.pincode 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        } rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                        placeholder=" "
                        maxLength={6}
                      />
                      {validationErrors.pincode && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{validationErrors.pincode}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowRedeemModal(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRedeemSubmit}
                    disabled={submitting || Object.keys(validationErrors).length > 0}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Confirm Redemption
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Order Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100] animate-fadeIn">
            <div className={`${isDark ? 'bg-gray-800/90 backdrop-blur-xl' : 'bg-white/90 backdrop-blur-xl'} rounded-2xl max-w-md w-full shadow-2xl border border-white/20 animate-scaleIn`}>
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-6 w-6 mr-2" />
                    Cancel Order
                  </h3>
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancellingOrderId(null);
                      setCancelReason('');
                      setValidationErrors({});
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to cancel this order? Your coins will be refunded to your account.
                </p>

                {/* Cancellation Reason */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for cancellation *
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => {
                      setCancelReason(e.target.value);
                      if (e.target.value.trim()) {
                        setValidationErrors(prev => {
                          const { quantity, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    rows={4}
                    className={`w-full px-4 py-2 border ${
                      validationErrors.quantity 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-red-500'
                    } rounded-lg focus:ring-2 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    placeholder="Please tell us why you're cancelling this order..."
                  />
                  {validationErrors.quantity && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {validationErrors.quantity}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancellingOrderId(null);
                      setCancelReason('');
                      setValidationErrors({});
                    }}
                    disabled={cancelSubmitting}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={handleCancelOrder}
                    disabled={cancelSubmitting || !cancelReason.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    {cancelSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 mr-2" />
                        Cancel Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Cancel Success Popup (single instance) */}
        {showCancelSuccess && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] animate-fadeIn">
            <div className={`${isDark ? 'bg-gray-800/90' : 'bg-white/90'} backdrop-blur-xl rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-white/20 animate-scaleIn`}>
              <div className="text-center space-y-3">
                <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
                  Order Cancelled
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your order has been cancelled successfully.
                </p>
                <button
                  onClick={() => setShowCancelSuccess(false)}
                  className="mt-3 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && successOrderDetails && (
          <SuccessPopup
            itemName={successOrderDetails.itemName}
            quantity={successOrderDetails.quantity}
            totalCost={successOrderDetails.totalCost}
            onViewOrders={() => {
              setShowSuccessPopup(false);
              setActiveTab('myorders');
            }}
            onClose={() => setShowSuccessPopup(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Redeem;
