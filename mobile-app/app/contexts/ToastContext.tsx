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
    top: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    maxWidth: "90%",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  toastSuccess: {
    backgroundColor: "#4caf50",
  },
  toastError: {
    backgroundColor: "#f44336",
  },
  toastInfo: {
    backgroundColor: "#333",
  },
  toastText: {
    color: "#fff",
    fontSize: 13,
  },
});

const ToastContextScreen: React.FC = () => null;
export default ToastContextScreen;
