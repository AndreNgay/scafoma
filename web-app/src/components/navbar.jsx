import React, {useState, useRef, useEffect} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import useStore from "../store/index.js"; // import Zustand store

const links = [
    {
        label: "Dashboard",
        path: "/overview"
    }, {
        label: "Cafeterias",
        path: "/cafeterias"
    }, {
        label: "Users",
        path: "/users"
    }, {
        label: "Menu Items",
        path: "/menu-items"
    }, {
        label: "Orders",
        path: "/orders"
    }
];

export const Navbar = () => {
    const [isOpen,
        setIsOpen] = useState(false);
    const [profileOpen,
        setProfileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const profileRef = useRef(null);

    const logout = useStore((state) => state.signOut);

    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout(); // clears Zustand + localStorage
        navigate("/sign-in", {replace: true});
    };

    return (
        <nav className="bg-gray-100 shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <span className="text-xl font-bold text-[#A62C2B]">SCaFOMA-UB</span>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
                        {links.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`transition-colors duration-200 ${location.pathname === link.path
                                ? "text-[#F2C94C] font-semibold border-b-2 border-[#F2C94C] pb-1"
                                : "text-[#2E2E2E] hover:text-[#A62C2B]"}`}>
                                {link.label}
                            </Link>
                        ))}

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="focus:outline-none">
                                <img
                                    src="https://placehold.co/40x40"
                                    alt="Profile"
                                    className="w-10 h-10 rounded-full border-2 border-[#A62C2B]"/>
                            </button>
                            {profileOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-50">
                                    <Link
                                        to="/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden focus:outline-none text-[#2E2E2E]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isOpen
                                ? (<path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"/>)
                                : (<path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"/>)}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden px-4 pb-4 bg-[#FFF8F0] space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsOpen(false)}
                            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${location.pathname === link.path
                            ? "bg-[#A62C2B] text-white"
                            : "text-[#2E2E2E] hover:bg-[#F2C94C] hover:text-[#2E2E2E]"}`}>
                            {link.label}
                        </Link>
                    ))}

                    {/* Mobile Profile */}
                    <div className="border-t pt-3">
                        <Link
                            to="/profile"
                            onClick={() => setIsOpen(false)}
                            className="block px-3 py-2 text-[#2E2E2E] hover:bg-[#F2C94C]">
                            Profile
                        </Link>
                        <button
                            onClick={() => {
                            setIsOpen(false);
                            handleLogout();
                        }}
                            className="w-full text-left px-3 py-2 text-[#2E2E2E] hover:bg-[#F2C94C]">
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};
