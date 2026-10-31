import React, { useMemo, useState } from "react";
import VirtualTryOn from "./components/VirtualTryOn.jsx";
import {
  Search, SlidersHorizontal, Plus, Menu, X, Heart, ArrowRight,
  Recycle, ShoppingBag, Leaf, Repeat2, Gift, ChevronDown, Check, Camera,
  Upload, MapPin, ShieldCheck, UserRound, Truck, LayoutDashboard, LogOut,
  CircleHelp, Bell, ArrowUpRight, Shirt
} from "lucide-react";
import Logo from "./components/Logo.jsx";
import ProductCard from "./components/ProductCard.jsx";
import Modal from "./components/Modal.jsx";
import Dashboard from "./components/Dashboard.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import SellPage from "./components/SellPage.jsx";
import CheckoutModal from "./components/CheckoutModal.jsx";
import ShipperDashboard from "./components/ShipperDashboard.jsx";
import HelpCenter from "./components/HelpCenter.jsx";
import { initialProducts, categories } from "./data/products.js";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import { useEffect, useRef } from "react";

const emptyListing = { title: "", category: "Tops", size: "M", condition: "Like new", price: "", location: "Indore", note: "", image: "", seller: "", type: "sale" };
const roleNames = { user: "User", shipper: "Shipper", admin: "Admin" };

const mapListing = (row) => ({ id: row.id, title: row.title, category: row.category, size: row.size, condition: row.condition, price: Number(row.price), seller: row.seller_name || "ReWear seller", sellerId: row.seller_id, location: row.location, note: row.note, image: row.image_url || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85", exchange: row.listing_type === "exchange", donate: row.listing_type === "donation" });

const countryCodes = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+52", flag: "🇲🇽", name: "Mexico" },
];

function LoginScreen({ mode, setMode, role, setRole, onSubmit, error }) {
  const [adminMode, setAdminMode] = useState(false);
  return <main className="auth-screen">
    <section className="auth-story"><div className="auth-brand"><Logo light/></div><div className="auth-story-copy"><span className="auth-kicker"><Leaf size={14}/> GOOD STYLE. SECOND LIFE.</span><h1>Fashion moves<br/><em>in circles.</em></h1><p>Find pre-loved pieces, pass on what you love, and make every outfit count.</p><div className="auth-photo"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85" alt="Friends exploring sustainable fashion"/><span><Recycle size={15}/> Wear better. Waste less.</span></div></div><small className="auth-footnote">A more thoughtful way to wear.</small></section>
    <section className="auth-panel"><div className="auth-panel-inner"><div className="auth-mini-brand"><Logo/></div>
      <div className="auth-heading"><span className="eyebrow">WELCOME TO REWEAR AI</span><h2>{adminMode ? "Admin sign in" : mode === "login" ? "Welcome back." : "Create your account."}</h2><p>{adminMode ? "Private access for authorized administrators only." : "Your next favourite outfit is waiting."}</p></div>
      {!adminMode && <div className="auth-role-switch" aria-label="Choose account type"><button className={role === "user" ? "selected" : ""} onClick={() => setRole("user")} type="button"><UserRound size={16}/> User</button><button className={role === "shipper" ? "selected" : ""} onClick={() => setRole("shipper")} type="button"><Truck size={16}/> Shipper</button></div>}
      <form className="auth-form" onSubmit={onSubmit}>{mode === "signup" && !adminMode && <label className="auth-field"><span>Full name</span><input name="fullName" required minLength="2" placeholder="Your full name" autoComplete="name"/></label>}<label className="auth-field"><span>{adminMode ? "Admin ID / Email" : "Email address"}</span><input name="email" type="email" required placeholder={adminMode ? "admin@rewear.ai" : "you@example.com"} autoComplete="username"/></label>{mode === "signup" && !adminMode && <label className="auth-field"><span>Mobile number</span><div className="phone-input-row"><select name="countryCode" aria-label="Country calling code" defaultValue="+91" required>{countryCodes.map((country, index) => <option key={`${country.name}-${index}`} value={country.code}>{country.flag} {country.name} ({country.code})</option>)}</select><input name="phoneNumber" type="tel" required inputMode="tel" autoComplete="tel-national" placeholder="Enter mobile number" pattern="[0-9 ()-]{7,18}" title="Enter a valid phone number using digits"/></div></label>}<label className="auth-field"><span>Password</span><input name="password" type="password" required minLength="6" placeholder="Enter your password" autoComplete={mode === "signup" && !adminMode ? "new-password" : "current-password"}/></label>{error && <p className="auth-error">{error}</p>}<button className="button button-dark auth-submit" type="submit">{adminMode ? "Enter admin dashboard" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16}/></button></form>
      {!adminMode && <p className="auth-switch">{mode === "login" ? "New to ReWear AI?" : "Already have an account?"} <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>}
      <div className="auth-admin-link"><ShieldCheck size={15}/><span>Administrator?</span><button type="button" onClick={() => {setAdminMode(!adminMode);setRole(adminMode ? "user" : "admin");}}> {adminMode ? "Back to user login" : "Admin sign in"}</button></div>
      {adminMode && <p className="auth-demo-note">Prototype demo credentials: admin@rewear.ai / ReWear@Admin2026. Secure server-side authentication is required before launch.</p>}
      <p className="auth-terms">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
    </div></section>
  </main>;
}

export default function App() {
  const [role, setRole] = useState("user");
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authRole, setAuthRole] = useState("user");
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState("marketplace");
  const [activeTab, setActiveTab] = useState("Shop");
  const [category, setCategory] = useState("All items");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [products, setProducts] = useState(initialProducts);
  const [dbStatus, setDbStatus] = useState(isSupabaseConfigured ? "connecting" : "not-configured");
  const [saved, setSaved] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tryProduct, setTryProduct] = useState(null);
  const [tryPhoto, setTryPhoto] = useState("");
  const [listingFile, setListingFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("rewear-cart") || "[]"); } catch { return []; } });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [listingForm, setListingForm] = useState({ ...emptyListing });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pickups, setPickups] = useState([]);
  const seenPickups = useRef(null);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let alive = true;
    const loadSessionAndListings = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession && alive) await applySupabaseSession(authSession);
      const { data, error } = await supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false });
      if (!alive) return;
      if (error) { setDbStatus("error"); console.error("Could not load listings:", error.message); return; }
      const rows = (data || []).map(mapListing);
      setProducts([...rows, ...initialProducts]);
      setDbStatus("connected");
    };
    const applySupabaseSession = async (authSession) => {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,phone_number,role").eq("id", authSession.user.id).maybeSingle();
      if (profileError) { console.error("Could not verify account profile:", profileError.message); return; }
      // Ask Supabase for the current user so a role assigned after login (e.g. admin) is not missed by an old saved session.
      const { data: freshData } = await supabase.auth.getUser();
      const appRole = (freshData?.user || authSession.user).app_metadata?.role;
      const userRole = appRole === "admin" ? "admin" : (profile?.role === "shipper" ? "shipper" : "user");
      if (!alive) return;
      setRole(userRole); setAuthRole(userRole); setSession({ email: authSession.user.email, name: profile?.full_name || authSession.user.user_metadata?.full_name || authSession.user.email?.split("@")[0] || roleNames[userRole], role: userRole, id: authSession.user.id });
      setView(userRole === "user" ? "marketplace" : "dashboard");
    };
    loadSessionAndListings();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession) window.setTimeout(() => applySupabaseSession(authSession), 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeTab === "Exchange") list = list.filter((p) => p.exchange || p.id % 2 === 0);
    // Donate tab = only what the signed-in user uploaded to donate (never other people's items).
    if (activeTab === "Donate") list = list.filter((p) => p.donate && p.sellerId && p.sellerId === session?.id);
    if (category !== "All items") list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((p) => `${p.title} ${p.category} ${p.size} ${p.location}`.toLowerCase().includes(query));
    }
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, activeTab, category, search, sort, session?.id]);

  const toggleSaved = (id) => setSaved((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]);
  const closeTry = () => { setTryProduct(null); setTryPhoto(""); };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) return notify("Please choose an image file.");
      if (file.size > 8 * 1024 * 1024) return notify("Choose an image smaller than 8 MB.");
      setTryPhoto(URL.createObjectURL(file));
    }
  };

  useEffect(() => { try { localStorage.setItem("rewear-cart", JSON.stringify(cart)); } catch {} }, [cart]);

  const addToCart = (product) => {
    if (role !== "user") return notify("Switch to a User account to shop.");
    if (product.sellerId && product.sellerId === session?.id) return notify("This is your own listing.");
    if (product.donate) return notify("Donated items are collected by a shipper and can't be bought from the cart.");
    if (cart.some((item) => item.id === product.id)) { setCartOpen(true); return; }
    setCart((old) => [...old, product]);
    notify("Added to your cart");
  };
  const removeFromCart = (id) => setCart((old) => old.filter((item) => item.id !== id));

  const openSell = () => {
    if (role !== "user") return notify("Switch to a User account to create a listing.");
    setListingForm((f) => ({ ...f, seller: f.seller || session?.name || "" }));
    setView("sell"); setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickListingPhoto = (file) => {
    if (!file) { setListingFile(null); setListingForm((f) => ({ ...f, image: "" })); return; }
    if (!file.type.startsWith("image/")) return notify("Please choose an image file.");
    if (file.size > 8 * 1024 * 1024) return notify("Choose an image smaller than 8 MB.");
    setListingFile(file);
    setListingForm((f) => ({ ...f, image: URL.createObjectURL(file) }));
  };

  const resetListingForm = () => { setListingFile(null); setListingForm({ ...emptyListing, seller: session?.name || "" }); };

  const submitListing = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const f = listingForm;
    const isDonation = f.type === "donation";
    if (!f.title.trim() || (!isDonation && (f.price === "" || Number(f.price) < 0))) return notify("Add a title and a valid price first.");
    if (!listingFile) return notify("Please take or upload a photo of the item.");
    if (!f.note.trim()) return notify("Add a short description of the item.");
    const sellerName = f.seller.trim() || session?.name || "ReWear seller";
    const listingType = f.type === "exchange" ? "exchange" : f.type === "donation" ? "donation" : "sale";

    if (isSupabaseConfigured && supabase) {
      if (!session?.id) return notify("Please sign in again before publishing.");
      setSubmitting(true);
      try {
        const path = `${session.id}/${crypto.randomUUID()}-${listingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("listing-photos").upload(path, listingFile, { upsert: false, contentType: listingFile.type });
        if (uploadError) throw uploadError;
        const imageUrl = supabase.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
        const payload = { seller_id: session.id, seller_name: sellerName, title: f.title.trim(), category: f.category, size: f.size, condition: f.condition, price: isDonation ? 0 : Number(f.price), location: f.location, note: f.note.trim(), image_url: imageUrl, listing_type: listingType };
        let { data, error } = await supabase.from("listings").insert(payload).select().single();
        if (error && /seller_name/.test(error.message || "")) {
          // Database was created before the seller_name column existed (run supabase/migrations/003_listing_seller_name.sql).
          const { seller_name, ...withoutSeller } = payload;
          ({ data, error } = await supabase.from("listings").insert(withoutSeller).select().single());
        }
        if (error) throw error;
        const next = { id: data.id, title: data.title, category: data.category, size: data.size, condition: data.condition, price: Number(data.price), seller: data.seller_name || sellerName, sellerId: session.id, image: data.image_url, location: data.location, note: data.note, exchange: listingType === "exchange", donate: listingType === "donation" };
        setProducts((old) => [next, ...old]);
        setDbStatus("connected");
        notify("Your item is live and saved to the database!");
        resetListingForm();
      } catch (error) {
        console.error(error);
        notify(`Could not publish listing: ${error.message || "database error"}`);
      } finally {
        setSubmitting(false);
      }
    } else {
      const next = { id: Date.now(), title: f.title.trim(), category: f.category, size: f.size, condition: f.condition, price: isDonation ? 0 : Number(f.price), seller: sellerName, sellerId: session?.id || "local", image: f.image, location: f.location, note: f.note.trim(), exchange: listingType === "exchange", donate: listingType === "donation" };
      setProducts((old) => [next, ...old]);
      notify("Demo listing added locally. Connect Supabase to save it permanently.");
      resetListingForm();
    }
  };

  const removeListing = async (item) => {
    if (isSupabaseConfigured && supabase && typeof item.id === "string") {
      const { error } = await supabase.from("listings").delete().eq("id", item.id).eq("seller_id", session.id);
      if (error) return notify(`Could not remove the listing: ${error.message}`);
    }
    setProducts((old) => old.filter((p) => p.id !== item.id));
    removeFromCart(item.id);
    notify("Listing removed.");
  };

  const refreshOrders = async () => {
    if (!supabase || session?.role !== "user") return;
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) console.warn("Could not load orders (run supabase/migrations/004_orders_pickups.sql):", error.message);
    else setOrders(data || []);
  };

  // Keeps pickups (shipper confirmations), orders and new uploads fresh without a page reload.
  useEffect(() => {
    if (!session?.id || !isSupabaseConfigured || !supabase) { setPickups([]); setOrders([]); seenPickups.current = null; return; }
    let alive = true;
    const load = async () => {
      const [pickupRes, listingRes] = await Promise.all([
        supabase.from("pickups").select("*").order("created_at", { ascending: false }),
        supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false }),
      ]);
      if (!alive) return;
      if (!listingRes.error && listingRes.data) setProducts([...listingRes.data.map(mapListing), ...initialProducts]);
      if (pickupRes.error) console.warn("Could not load pickups (run supabase/migrations/004_orders_pickups.sql):", pickupRes.error.message);
      else {
        const rows = pickupRes.data || [];
        setPickups(rows);
        if (session.role === "user") {
          if (seenPickups.current) rows.filter((p) => p.seller_id === session.id && !seenPickups.current.has(p.id)).forEach((p) => notify(`${p.shipper_name || "A shipper"} confirmed your product and is coming. Check your Dashboard.`));
          seenPickups.current = new Set(rows.map((p) => p.id));
        }
      }
      if (session.role === "user") await refreshOrders();
    };
    load();
    const timer = window.setInterval(load, 20000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [session?.id, session?.role]);

  const confirmPickup = async (listing, minutes) => {
    const { data, error } = await supabase.from("pickups").insert({ listing_id: listing.id, shipper_id: session.id, eta_minutes: minutes }).select().single();
    if (error) {
      notify(error.code === "23505" ? "Another shipper has already confirmed this item." : `Could not confirm the pickup: ${error.message}`);
      const { data: fresh } = await supabase.from("pickups").select("*").order("created_at", { ascending: false });
      if (fresh) setPickups(fresh);
      return false;
    }
    setPickups((old) => [data, ...old]);
    notify("Pickup confirmed. The user can now see when you will arrive.");
    return true;
  };
  const markPickedUp = async (pickup) => {
    const { data, error } = await supabase.from("pickups").update({ status: "picked_up" }).eq("id", pickup.id).select().single();
    if (error) return notify(`Could not update: ${error.message}`);
    setPickups((old) => old.map((p) => (p.id === pickup.id ? data : p)));
    notify("Marked as picked up.");
  };
  const cancelPickup = async (pickup) => {
    const { error } = await supabase.from("pickups").delete().eq("id", pickup.id);
    if (error) return notify(`Could not cancel: ${error.message}`);
    setPickups((old) => old.filter((p) => p.id !== pickup.id));
    notify("Pickup cancelled. Other shippers can confirm it now.");
  };

  const chooseRole = (newRole) => {
    setRole(newRole);
    setView(newRole === "user" ? "marketplace" : "dashboard");
    setMobileMenu(false);
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const fullName = String(data.get("fullName") || "").trim();
    const countryCode = String(data.get("countryCode") || "+91").trim();
    const phoneLocal = String(data.get("phoneNumber") || "").replace(/[^0-9]/g, "");
    const phoneNumber = phoneLocal;
    setAuthError("");
    if (!isSupabaseConfigured || !supabase) {
      setAuthError("Database not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the .env file, then restart npm run dev.");
      return;
    }
    try {
      if (authRole === "admin") {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (authData.user.app_metadata?.role !== "admin") {
          await supabase.auth.signOut();
          throw new Error("This account is not authorized as an admin. Assign admin role securely in Supabase first.");
        }
        const user = authData.user;
        setRole("admin"); setView("dashboard"); setSession({ email: user.email, name: user.user_metadata?.full_name || "Admin", role: "admin", id: user.id });
        return;
      }
      if (authMode === "signup") {
        const { data: authData, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone_number: phoneNumber, phone_country_code: countryCode, role: authRole } } });
        if (error) throw error;
        if (!authData.session) {
          setAuthError("Account created. Check your email to confirm it, then sign in.");
          setAuthMode("login");
          return;
        }
        setRole(authRole); setView(authRole === "user" ? "marketplace" : "dashboard"); setSession({ email, name: fullName || authData.user.user_metadata?.full_name || email.split("@")[0], role: authRole, id: authData.user.id });
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,phone_number,role").eq("id", authData.user.id).maybeSingle();
        if (profileError) throw profileError;
        if (!profile) { await supabase.auth.signOut(); throw new Error("Your account profile was not found in the database. Please contact support or sign up again."); }
        const actualRole = authData.user.app_metadata?.role === "admin" ? "admin" : (profile.role === "shipper" ? "shipper" : "user");
        if (actualRole !== authRole) { await supabase.auth.signOut(); throw new Error(`This account is registered as ${actualRole}. Select the matching account type.`); }
        setRole(actualRole); setView(actualRole === "user" ? "marketplace" : "dashboard"); setSession({ email: authData.user.email, name: profile.full_name || authData.user.user_metadata?.full_name || authData.user.email?.split("@")[0] || roleNames[actualRole], role: actualRole, id: authData.user.id });
      }
    } catch (error) { setAuthError(error.message || "Authentication failed. Please try again."); }
  };

  if (!session) return <LoginScreen mode={authMode} setMode={setAuthMode} role={authRole} setRole={setAuthRole} onSubmit={handleAuth} error={authError} />;

  return (
    <div className="app-shell">
      <div className="announcement-bar"><Leaf size={14}/><span>Good style. Second life.</span><span className="announcement-divider">·</span><span>Wear better, waste less.</span><ArrowRight size={13}/></div>
      <header className="site-header">
        <div className="header-inner">
          <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X/> : <Menu/>}</button>
          <button className="logo-button" onClick={() => {setView(role === "shipper" ? "dashboard" : "marketplace");setActiveTab("Shop");}}><Logo/></button>
          <nav className={`main-nav ${mobileMenu ? "nav-open" : ""}`}>
            {role !== "shipper" && <button className={view === "marketplace" && activeTab === "Shop" ? "nav-link active" : "nav-link"} onClick={() => {setView("marketplace");setActiveTab("Shop");setMobileMenu(false);}}>Shop</button>}
            {role !== "shipper" && <button className={view === "marketplace" && activeTab === "Exchange" ? "nav-link active" : "nav-link"} onClick={() => {setView("marketplace");setActiveTab("Exchange");setMobileMenu(false);}}>Exchange</button>}
            {role !== "shipper" && <button className={view === "marketplace" && activeTab === "Donate" ? "nav-link active" : "nav-link"} onClick={() => {setView("marketplace");setActiveTab("Donate");setMobileMenu(false);}}>Donate</button>}
            {role === "user" && <button className={view === "sell" ? "nav-link active" : "nav-link"} onClick={openSell}>Sell</button>}
            <button className={view === "dashboard" ? "nav-link active" : "nav-link"} onClick={() => {setView("dashboard");setMobileMenu(false);}}>Dashboard</button>
            <button className={view === "help" ? "nav-link active" : "nav-link"} onClick={() => {setView("help");setMobileMenu(false);}}>Help</button>
          </nav>
          <div className="header-actions">
            <div className={`signed-in-chip signed-in-chip-${session.role}`} aria-label={`${roleNames[session.role]} account: ${session.name || roleNames[session.role]}`}>
              <span className="account-role-mark" aria-hidden="true">{session.role === "user" ? "🌸" : session.role === "shipper" ? "🚚" : "🛡️"}</span>
              <span>{session.role === "admin" ? "Admin" : (session.name || roleNames[session.role])}</span>
            </div>
            <button className="signout-button" onClick={async () => { if (supabase) await supabase.auth.signOut(); setSession(null); setCart([]); setCartOpen(false); setCheckoutOpen(false); setOrders([]); setPickups([]); resetListingForm(); setAuthRole("user"); setAuthMode("login"); setView("marketplace"); }}><LogOut size={15}/><span>Log out</span></button>
            {role !== "shipper" && <button className="header-sell-button" onClick={openSell}><Plus size={16}/><span>Sell an item</span></button>}
            {role !== "shipper" && <button className="header-bag" onClick={() => notify(`${saved.length} saved item${saved.length === 1 ? "" : "s"}`)} aria-label="Saved items"><Heart size={19}/>{saved.length > 0 && <span>{saved.length}</span>}</button>}
            {role === "user" && <button className="header-bag header-cart" onClick={() => setCartOpen(true)} aria-label={`Cart, ${cart.length} item${cart.length === 1 ? "" : "s"}`}><ShoppingBag size={19}/>{cart.length > 0 && <span>{cart.length}</span>}</button>}
          </div>
        </div>
      </header>

      {view === "marketplace" && role !== "shipper" ? (
        <>
          {activeTab === "Shop" && <section className="hero-section">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="kicker-dot"/> THE FUTURE IS RE-WORN</div>
              <h1>Great style.<br/><em>Second life.</em></h1>
              <p>Find pre-loved pieces, give your wardrobe a refresh, and let good clothes keep going.</p>
              <div className="hero-actions"><button className="button button-dark" onClick={() => document.getElementById("discover")?.scrollIntoView({behavior:"smooth"})}>Explore the edit <ArrowRight size={16}/></button><button className="hero-text-link" onClick={openSell}>Give clothes a new home <ArrowUpRight size={15}/></button></div>
              <div className="hero-proof"><div className="proof-avatars"><span>A</span><span>M</span><span>R</span></div><div><strong>Good finds, better future.</strong><small>Fashion that keeps moving.</small></div></div>
            </div>
            <div className="hero-art">
              <div className="hero-image-main"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=90" alt="Friends exploring fashion together"/><div className="hero-image-overlay"><span>THE REWEAR EDIT</span><strong>Wear your values.</strong></div></div>
              <div className="floating-note note-top"><span className="note-icon"><Recycle size={18}/></span><div><strong>Re-loved, not less loved.</strong><small>One piece. More stories.</small></div></div>
              <div className="floating-note note-bottom"><span className="note-spark"><Shirt size={17}/></span><div><strong>Try before you buy</strong><small>Virtual try-on, coming to life</small></div></div>
              <div className="hero-stamp"><span>BUY LESS</span><span>CHOOSE WELL</span><span>REWEAR OFTEN</span></div>
            </div>
          </section>}

          <main id="discover" className="marketplace-main">
            <div className="section-intro">
              <div><div className="eyebrow">{activeTab === "Shop" ? "A SECOND LIFE LOOKS GOOD ON YOU" : activeTab === "Exchange" ? "SWAP SOMETHING YOU LOVE" : "PASS GOOD THINGS FORWARD"}</div><h2>{activeTab === "Shop" ? "Find your next favourite." : activeTab === "Exchange" ? "A fresh fit, no new buy." : "Make room for good."}</h2><p>{activeTab === "Shop" ? "Pre-loved pieces with plenty of life left." : activeTab === "Exchange" ? "Explore pieces that could find a new home through swapping." : "Give wearable clothes another chapter."}</p></div>
              <div className="result-count"><span className="result-dot"/>{filteredProducts.length} pieces to explore</div>
            </div>
            <div className="discovery-controls">
              <div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? "category-tab selected" : "category-tab"} onClick={() => setCategory(item)}>{item}</button>)}</div>
              <div className="search-sort-row">
                <label className="search-box"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pieces, categories..." /><kbd>⌘ K</kbd></label>
                <label className="sort-select"><SlidersHorizontal size={16}/><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><ChevronDown size={14}/></label>
              </div>
            </div>
            {filteredProducts.length ? <div className="product-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} saved={saved.includes(product.id)} onSave={toggleSaved} onOpen={setSelectedProduct} onTry={setTryProduct} inCart={cart.some((i) => i.id === product.id)} onAddToCart={addToCart}/>)}</div> : <div className="empty-state"><div className="empty-icon"><Search size={24}/></div><h3>No pieces found just yet.</h3><p>Try another search or choose a different category.</p><button className="button button-outline" onClick={() => {setSearch("");setCategory("All items");}}>Clear filters</button></div>}
            <div className="load-more-wrap"><button className="button button-outline" onClick={() => notify("You're all caught up with this demo collection.")}>You're all caught up <Check size={15}/></button></div>
          </main>
          <section className="try-banner"><div className="try-banner-icon"><Shirt size={23}/></div><div><div className="eyebrow">A LITTLE MAGIC, LESS GUESSWORK</div><h2>See the fit before it finds you.</h2><p>Preview the try-on flow today. AI garment rendering will connect in a later phase.</p></div><button className="button button-light" onClick={() => {setTryProduct(products[0]);}}>Explore virtual try-on <ArrowRight size={16}/></button></section>
          <section className="values-strip"><div className="value-item"><span><Recycle size={20}/></span><div><strong>Keep it in circulation</strong><small>Less waste, more wear.</small></div></div><div className="value-item"><span><Heart size={20}/></span><div><strong>Good finds, fair prices</strong><small>Style without the full price.</small></div></div><div className="value-item"><span><Gift size={20}/></span><div><strong>Pass it forward</strong><small>Sell, swap or donate.</small></div></div></section>
        </>
      ) : view === "sell" && role === "user" ? <SellPage form={listingForm} setForm={setListingForm} onPhoto={pickListingPhoto} onSubmit={submitListing} submitting={submitting} myItems={products.filter((p) => p.sellerId && p.sellerId === session?.id)} onRemove={removeListing} categories={categories} notify={notify}/> : view === "help" ? <HelpCenter role={role}/> : role === "shipper" ? <ShipperDashboard session={session} listings={products} pickups={pickups} onConfirm={confirmPickup} onPicked={markPickedUp} onCancel={cancelPickup}/> : <Dashboard role={role} onAddListing={openSell} myItems={products.filter((p) => p.sellerId && p.sellerId === session?.id)} pickups={pickups} orders={orders} savedCount={saved.length}/>}

      <footer className="site-footer"><div className="footer-top"><div><Logo light/><p>Give clothes a second life.<br/>Make better fashion choices, together.</p></div><div className="footer-links">{role !== "shipper" && <div><strong>Discover</strong><button onClick={() => {setView("marketplace");setActiveTab("Shop");}}>Shop clothes</button><button onClick={() => {setView("marketplace");setActiveTab("Exchange");}}>Exchange</button><button onClick={() => {setView("marketplace");setActiveTab("Donate");}}>Donate</button></div>}<div><strong>Your account</strong><button onClick={() => setView("dashboard")}>Dashboard</button>{role !== "shipper" && <button onClick={openSell}>List an item</button>}<button onClick={() => {setView("help");window.scrollTo({ top: 0, behavior: "smooth" });}}>Help centre</button></div></div></div><div className="footer-bottom"><span>© 2026 ReWear AI · A concept for circular fashion.</span><span><Leaf size={14}/> Wear better. Waste less.</span></div></footer>

      {selectedProduct && <Modal title={selectedProduct.title} eyebrow={`${selectedProduct.category} · ${selectedProduct.condition}`} onClose={() => setSelectedProduct(null)} wide>
        <div className="product-detail-modal"><img src={selectedProduct.image} alt={selectedProduct.title}/><div className="product-detail-copy"><div className="detail-price">₹{selectedProduct.price}</div><p>{selectedProduct.note}</p><div className="detail-facts"><div><span>Size</span><strong>{selectedProduct.size}</strong></div><div><span>Condition</span><strong>{selectedProduct.condition}</strong></div><div><span>Location</span><strong>{selectedProduct.location}</strong></div><div><span>Listed by</span><strong>{selectedProduct.seller}</strong></div></div><div className="detail-sustainability"><Leaf size={17}/><span>Pre-loved means less waste and more life for a good piece.</span></div><button className="button button-dark button-full" onClick={() => {setSelectedProduct(null);setTryProduct(selectedProduct);}}><Shirt size={16}/> Try it on</button><button className="button button-outline button-full" onClick={() => {addToCart(selectedProduct);setSelectedProduct(null);}}><ShoppingBag size={16}/> {cart.some((i) => i.id === selectedProduct.id) ? "View in cart" : "Add to cart"}</button><button className="text-button detail-save" onClick={() => toggleSaved(selectedProduct.id)}><Heart size={16}/> {saved.includes(selectedProduct.id) ? "Remove from saved" : "Save this piece"}</button></div></div>
      </Modal>}

      {tryProduct && <Modal title="Your virtual fitting room" eyebrow="REWEAR AI TRY-ON" onClose={closeTry} wide>
        <div className="try-modal-content"><div className="try-preview"><div className="try-preview-label">PREVIEW STUDIO</div>{tryPhoto ? <img className="user-preview-image" src={tryPhoto} alt="Your uploaded photo preview"/> : <div className="try-placeholder"><div className="placeholder-person"><UserRound size={60}/></div><strong>Your look starts here.</strong><small>Upload a photo to preview the fitting room.</small></div>}<div className="try-selected-item"><img src={tryProduct.image} alt={tryProduct.title}/><div><small>SELECTED PIECE</small><strong>{tryProduct.title}</strong><span>₹{tryProduct.price} · Size {tryProduct.size}</span></div></div></div><div className="try-controls"><div className="try-step"><span>01</span><div><strong>Add your photo</strong><p>Use a clear, full-length photo for the best preview.</p></div></div><label className="upload-zone"><Upload size={20}/><strong>{tryPhoto ? "Choose another photo" : "Upload a photo"}</strong><span>JPG or PNG · Up to 8 MB</span><input type="file" accept="image/*" onChange={handlePhoto}/></label><div className="privacy-note"><ShieldCheck size={17}/><span>Your photo is only previewed in this browser prototype. It is not sent to an AI service.</span></div><button className="button button-dark button-full" onClick={() => notify(tryPhoto ? "Photo loaded. AI garment rendering will be connected in Phase 3." : "Upload a photo to continue.")}>{tryPhoto ? "Generate AI try-on (coming soon)" : "Continue to preview"}</button><p className="prototype-disclaimer">This prototype does not digitally fit the garment onto your photo yet. AI generation will be connected in Phase 3.</p></div></div>
      </Modal>}
      {tryProduct && (
  <Modal
    title="Your virtual fitting room"
    eyebrow="REWEAR AI TRY-ON"
    onClose={closeTry}
    wide
  >
    <VirtualTryOn
      product={tryProduct}
      onClose={closeTry}
    />
  </Modal>
)}

      {cartOpen && <CartDrawer items={cart} onClose={() => setCartOpen(false)} onRemove={removeFromCart} onClear={() => setCart([])} onBrowse={() => { setCartOpen(false); setView("marketplace"); setActiveTab("Shop"); }} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}/>}

      {checkoutOpen && <CheckoutModal items={cart} onClose={() => setCheckoutOpen(false)} onOrderSaved={() => { setCart([]); refreshOrders(); }} notify={notify}/>}

      {role === "user" && !cartOpen && <button className="cart-fab" onClick={() => setCartOpen(true)} aria-label="Open cart"><ShoppingBag size={20}/>{cart.length > 0 && <span>{cart.length}</span>}</button>}

      {toast && <div className="toast-message"><Check size={17}/>{toast}</div>}
    </div>
  );
}