import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { AdminLogin } from './components/AdminLogin';
import { StudentView } from './components/StudentView';
import { OnlineOrderView } from './components/OnlineOrderView';
import { StaffView } from './components/StaffView';
import { AdminView } from './components/AdminView';
import { CanteenSetup } from './components/CanteenSetup';
import { BackendService, initializeDemoData } from './services/mockBackend';
import { UserRole, Canteen, Token } from './types';
import { Users, ChefHat, LayoutDashboard, ArrowRight, Zap, MapPin, QrCode, ScanLine, ShoppingCart } from 'lucide-react';

// Expose demo initialization to window immediately
if (typeof window !== 'undefined') {
  (window as any).initDemoData = initializeDemoData;
}

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.NONE);
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [orderType, setOrderType] = useState<'CAMPUS' | 'ONLINE' | null>(null);

  // Initialization: Check URL params for canteenId (Simulating QR Scan if used directly)
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const canteenId = params.get('canteenId');
      if (canteenId) {
          const canteen = BackendService.getCanteen(canteenId);
          if (canteen) {
              setSelectedCanteen(canteen);
          } else {
              console.warn("Invalid Canteen ID in URL");
          }
      }

      // Check if user was previously logged in
      const adminCanteenId = sessionStorage.getItem('adminCanteenId');
      if (adminCanteenId) {
          const canteen = BackendService.getCanteen(adminCanteenId);
          if (canteen) {
              setSelectedCanteen(canteen);
              setCurrentRole(UserRole.ADMIN);
          }
      }
  }, []);

  const handleCanteenCreated = (canteen: Canteen) => {
      setSelectedCanteen(canteen);
      setCurrentRole(UserRole.ADMIN);
      sessionStorage.setItem('adminCanteenId', canteen.id);
      sessionStorage.setItem('adminCanteenName', canteen.name);
      
      const url = new URL(window.location.href);
      url.searchParams.set('canteenId', canteen.id);
      window.history.pushState({}, '', url);
  };

  const handleAdminLogin = (canteen: Canteen) => {
      setSelectedCanteen(canteen);
      setCurrentRole(UserRole.ADMIN);
      setIsLoggingIn(false);
      
      const url = new URL(window.location.href);
      url.searchParams.set('canteenId', canteen.id);
      window.history.pushState({}, '', url);
  };

  const handleLogout = () => {
      setCurrentRole(UserRole.NONE);
      setOrderType(null);
      sessionStorage.removeItem('adminCanteenId');
      sessionStorage.removeItem('adminCanteenName');
  };

  const handleExitCanteen = () => {
      setSelectedCanteen(null);
      setCurrentRole(UserRole.NONE);
      setOrderType(null);
      sessionStorage.removeItem('adminCanteenId');
      sessionStorage.removeItem('adminCanteenName');
      const url = new URL(window.location.href);
      url.searchParams.delete('canteenId');
      window.history.pushState({}, '', url);
  };

  // New handler for Global Student Entry
  const handleStudentStart = () => {
      setCurrentRole(UserRole.STUDENT);
      setOrderType(null); // Reset order type to show selection
  };

  const handleOrderPlaced = (token: Token) => {
      // Order placed successfully - can add analytics or notifications here
      console.log('Order placed:', token);
  };

  const renderContent = () => {
    // 0. Show admin login if clicking admin (highest priority)
    if (isLoggingIn) {
        return <AdminLogin onLogin={handleAdminLogin} onBack={() => setIsLoggingIn(false)} />;
    }

    // 1. Global Landing (No Canteen Selected)
    if (!selectedCanteen) {
        if (isRegistering) {
            return <CanteenSetup onComplete={handleCanteenCreated} />;
        }

        // If a student selects "Start Order" from global page - show order type selection
        if (currentRole === UserRole.STUDENT && !orderType) {
            return (
              <div className="max-w-5xl mx-auto mt-16 px-4 animate-slide-up">
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-6 border border-primary-100 shadow-sm">
                    <Zap size={14} className="fill-primary-700" />
                    <span>Order Method</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                    How do you want to order?
                  </h1>
                  <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    Choose between picking up at campus or ordering online with delivery
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Campus Queue */}
                  <button 
                    onClick={() => setOrderType('CAMPUS')}
                    className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300"
                  >
                    <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                      <ScanLine size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Campus Queue</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                      Order at campus. Scan QR at the food counter after receiving your token to join the queue.
                    </p>
                    <div className="mt-auto inline-flex items-center font-bold bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                      Pick Up at Campus <ArrowRight size={18} className="ml-2" />
                    </div>
                  </button>

                  {/* Online Payment */}
                  <button 
                    onClick={() => setOrderType('ONLINE')}
                    className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300"
                  >
                    <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
                      <ShoppingCart size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Online Order</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                      Order online with Razorpay payment. Skip the queue and wait virtually for your food.
                    </p>
                    <div className="mt-auto inline-flex items-center font-bold bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30">
                      Order Online <ArrowRight size={18} className="ml-2" />
                    </div>
                  </button>
                </div>

                <div className="text-center mt-12">
                  <button
                    onClick={() => setCurrentRole(UserRole.NONE)}
                    className="px-6 py-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            );
        }

        // Campus Queue Flow
        if (currentRole === UserRole.STUDENT && orderType === 'CAMPUS') {
            return <StudentView />;
        }

        // Online Order Flow
        if (currentRole === UserRole.STUDENT && orderType === 'ONLINE') {
            return <OnlineOrderView onOrderPlaced={handleOrderPlaced} />;
        }

        return (
            <div className="max-w-5xl mx-auto mt-16 px-4 animate-slide-up">
                 <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-6 border border-primary-100 shadow-sm">
                        <Zap size={14} className="fill-primary-700" />
                        <span>SmartQueue Global System</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight">
                        Orchestrate Your <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">Dining Experience.</span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                        A centralized platform for universities and corporate campuses to manage cafeteria queues with AI precision.
                    </p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                     {/* Student Path - Direct Order */}
                     <button 
                        onClick={handleStudentStart}
                        className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300"
                     >
                        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                            <ScanLine size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Place an Order</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            Select your food item first, then scan the specific Canteen QR code to join the queue.
                        </p>
                        <div className="mt-auto inline-flex items-center font-bold bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                            Start Order <ArrowRight size={18} className="ml-2" />
                        </div>
                     </button>

                     {/* Admin Login */}
                     <button 
                        onClick={() => setIsLoggingIn(true)}
                        className="bg-gradient-to-br from-purple-500 to-purple-600 p-8 rounded-3xl shadow-xl shadow-purple-500/20 flex flex-col items-center text-center text-white group hover:-translate-y-1 transition-transform duration-300"
                     >
                        <div className="w-20 h-20 bg-purple-400/30 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                            <ChefHat size={40} />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Admin Portal</h2>
                        <p className="text-purple-100 mb-8 leading-relaxed">
                            Login to your existing canteen to view orders and manage kitchen staff.
                        </p>
                        <div className="mt-auto inline-flex items-center font-bold bg-white text-purple-600 px-6 py-3 rounded-xl hover:bg-purple-50 transition-colors">
                            Login <ArrowRight size={18} className="ml-2" />
                        </div>
                     </button>

                     {/* Register New Canteen */}
                     <button 
                        onClick={() => setIsRegistering(true)}
                        className="bg-gray-900 p-8 rounded-3xl shadow-xl shadow-gray-900/20 flex flex-col items-center text-center text-white group hover:-translate-y-1 transition-transform duration-300"
                     >
                        <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                            <LayoutDashboard size={40} />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Register Canteen</h2>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            Register a new campus canteen, generate QR code, and start managing queues today.
                        </p>
                        <div className="mt-auto inline-flex items-center font-bold bg-white text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors">
                            Register New <ArrowRight size={18} className="ml-2" />
                        </div>
                     </button>
                 </div>
            </div>
        )
    }

    // 2. Role Selection Screen (Specific to Canteen)
    if (currentRole === UserRole.NONE) {
        return (
          <div className="max-w-5xl mx-auto mt-8 sm:mt-16">
            <div className="text-center mb-12 animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-semibold mb-6 shadow-sm">
                 <MapPin size={14} className="text-primary-600" />
                 <span>{selectedCanteen.name} • {selectedCanteen.campus}</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
                Welcome to <span className="text-primary-600">{selectedCanteen.name}</span>
              </h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Select your role to access the real-time queue system.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <RoleCard 
                role="Kitchen Staff" 
                desc="Manage incoming orders efficiently with a digital KDS." 
                icon={<ChefHat className="w-8 h-8 text-white" />}
                color="from-orange-500 to-orange-600"
                onClick={() => setCurrentRole(UserRole.STAFF)} 
              />
              <RoleCard 
                role="Administrator" 
                desc="Analyze peak hours and optimize canteen performance." 
                icon={<LayoutDashboard className="w-8 h-8 text-white" />}
                color="from-purple-500 to-purple-600"
                onClick={() => setCurrentRole(UserRole.ADMIN)} 
              />
            </div>
            <div className="mt-12 text-center">
                 <button onClick={handleExitCanteen} className="text-sm text-gray-400 hover:text-gray-600 underline">
                     Exit {selectedCanteen.name}
                 </button>
            </div>
          </div>
        );
    }

    // 3. Specific Role Views
    switch (currentRole) {
      case UserRole.STUDENT:
        // Pass selectedCanteen if available, otherwise StudentView handles scanning
        return <StudentView canteen={selectedCanteen || undefined} />;
      case UserRole.STAFF:
        return <StaffView canteen={selectedCanteen!} onLogout={handleLogout} />;
      case UserRole.ADMIN:
        return <AdminView canteen={selectedCanteen!} onLogout={handleLogout} />;
      default: return null;
    }
  };

  return (
    <Layout role={currentRole} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

const RoleCard = ({ role, desc, icon, color, onClick }: { role: string, desc: string, icon: React.ReactNode, color: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="relative group bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 text-left hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-900/10 overflow-hidden"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 rounded-bl-[100px] transition-transform group-hover:scale-150 duration-500`} />
    
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg mb-6 group-hover:rotate-6 transition-transform duration-300`}>
      {icon}
    </div>
    
    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">{role}</h3>
    <p className="text-gray-500 leading-relaxed mb-6">{desc}</p>
    
    <div className="flex items-center text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
      Enter Portal <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
    </div>
  </button>
);

export default App;