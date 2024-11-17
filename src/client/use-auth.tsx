import { createContext, useContext, useEffect, useState } from "react";
import { UserData } from "./user-info-types";
import { buildAuthUrl, fetchUserData } from "./auth-service";
import axios from "axios";

type AuthContextType = {
  isLoggedIn: boolean;
  userData: UserData | null;
  username: string | null;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Calculate username from UserData
  const username = userData ? userData.name : null;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchUserData(token)
        .then((data) => {
          setUserData(data);
          setIsLoggedIn(true);
          setAuthLoading(false); // Set loading to false once user data is fetched
        })
        .catch((err) => {
          console.error("failed to fetch user data:", err);
          logout(); // Ensures clean state on failure
          setAuthLoading(false); // Ensure loading state is handled even in error
        });
    } else {
      setAuthLoading(false); // If no token, ensure loading is set to false
    }
  }, []);

  const login = async () => {
    try {
      const response = await axios.get("/get-csrf-token");
      const csrfToken = response.data.csrfToken;
      const authUrl = buildAuthUrl(csrfToken);
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error fetching CSRF token or building auth URL:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
    setUserData(null);
    setAuthLoading(true); // reset auth loading state on logout
    window.location.href = "/profile";
    window.dispatchEvent(new CustomEvent("authUpdate"));
  };

  // prevent rendering of children if authentication status is unknown
  if (authLoading) {
    return null; // Or you could return a loading spinner or some component
  }

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, userData, username, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
