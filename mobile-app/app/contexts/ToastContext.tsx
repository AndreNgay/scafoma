import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export type ToastType = "success" | "error" | "info";

type ToastContextValue = {
  showToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>("info");
  const [opacity] = useState(new Animated.Value(0));

  const showToast = useCallback((nextType: ToastType, nextMessage: string) => {
    setType(nextType);
    setMessage(nextMessage);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible || !message) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setVisible(false);
          setMessage((current) => (current === message ? null : current));
        }
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [visible, message, opacity]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && message && (
        <View pointerEvents="none" style={styles.wrapper}>
          <Animated.View
            style={[
              styles.toast,
              type === "error"
                ? styles.toastError
                : type === "success"
                ? styles.toastSuccess
                : styles.toastInfo,
              { opacity },
            ]}
          >
            <Text style={styles.toastText}>{message}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 50,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  toast: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: "#10b981",
    borderWidth: 1,
    borderColor: "#059669",
  },
  toastError: {
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  toastInfo: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#111827",
  },
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
});

const ToastContextScreen: React.FC = () => null;
export default ToastContextScreen;
