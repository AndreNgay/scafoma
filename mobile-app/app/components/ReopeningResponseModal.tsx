import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DeclineReason {
  key: string;
  label: string;
  description: string;
}

interface ReopeningResponseModalProps {
  visible: boolean;
  onClose: () => void;
  onApprove: () => void;
  onDecline: (reasonType: string, customMessage: string) => void;
  request: any;
  loading?: boolean;
}

const DECLINE_REASONS: DeclineReason[] = [
  {
    key: "too_many_requests",
    label: "Too Many Requests",
    description:
      "Customer has exceeded the maximum number of reopening requests",
  },
  {
    key: "order_too_old",
    label: "Order Too Old",
    description: "This order is too old to be reopened",
  },
  {
    key: "policy_violation",
    label: "Policy Violation",
    description: "Reopening request violates our policy",
  },
  {
    key: "insufficient_reason",
    label: "Insufficient Reason",
    description: "The reason provided is not sufficient",
  },
  {
    key: "repeated_offense",
    label: "Repeated Offense",
    description: "This customer has a history of similar issues",
  },
  {
    key: "inventory_unavailable",
    label: "Inventory Unavailable",
    description: "Items are no longer available",
  },
  {
    key: "other",
    label: "Other",
    description: "Other reason (please specify below)",
  },
];

const ReopeningResponseModal: React.FC<ReopeningResponseModalProps> = ({
  visible,
  onClose,
  onApprove,
  onDecline,
  request,
  loading = false,
}) => {
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  const handleApprove = () => {
    onApprove();
  };

  const handleDecline = () => {
    if (!selectedReason) return;
    onDecline(selectedReason, customMessage.trim());
  };

  const handleClose = () => {
    setShowDeclineForm(false);
    setSelectedReason(null);
    setCustomMessage("");
    onClose();
  };

  const canSubmitDecline =
    selectedReason &&
    (selectedReason !== "other" || customMessage.trim().length > 0);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[date.getMonth()];
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;

      return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
    } catch {
      return dateString;
    }
  };

  const getReasonLabel = (reasonKey: string) => {
    const reasonLabels: { [key: string]: string } = {
      missed_deadline: "Missed Deadline",
      technical_issue: "Technical Issue",
      payment_delay: "Payment Delay",
      forgot_upload: "Forgot to Upload",
      network_issue: "Network Issue",
      busy_schedule: "Busy Schedule",
      emergency: "Emergency",
      misunderstood_timer: "Misunderstood Timer",
      other: "Other",
    };
    return reasonLabels[reasonKey] || reasonKey;
  };

  if (!request) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdropTouchable}
          onPress={handleClose}
          disabled={loading}
        />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {showDeclineForm
                ? "Decline Reopening Request"
                : "Reopening Request"}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {!showDeclineForm ? (
              <>
                {/* Request Info */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Order ID:</Text>
                    <Text style={styles.infoValue}>#{request.order_id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Customer:</Text>
                    <Text style={styles.infoValue}>
                      {request.customer_name}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Requested:</Text>
                    <Text style={styles.infoValue}>
                      {formatDateTime(
                        request.requested_at || request.created_at,
                      )}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reason Type:</Text>
                    <Text style={styles.infoValue}>
                      {getReasonLabel(request.request_type)}
                    </Text>
                  </View>
                </View>

                {/* Customer Message */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Customer Message</Text>
                  <View style={styles.messageCard}>
                    <Text style={styles.messageText}>
                      {request.request_message}
                    </Text>
                  </View>
                </View>

                {/* Decline Reason Info */}
                {request.decline_reason && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Original Decline Reason
                    </Text>
                    <View
                      style={[styles.messageCard, styles.declineMessageCard]}
                    >
                      <Text style={styles.declineReasonText}>
                        {request.decline_reason}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Info Note */}
                <View style={styles.infoNote}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color="#0066cc"
                  />
                  <Text style={styles.infoNoteText}>
                    If you approve this request, the order will be reopened and
                    the customer will have another chance to upload their
                    payment receipt.
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Decline Form */}
                <Text style={styles.formInstruction}>
                  Please select a reason for declining this reopening request:
                </Text>

                {/* Decline Reasons */}
                <View style={styles.reasonsContainer}>
                  {DECLINE_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.key}
                      style={[
                        styles.reasonOption,
                        selectedReason === reason.key &&
                          styles.reasonOptionSelected,
                      ]}
                      onPress={() => setSelectedReason(reason.key)}
                      activeOpacity={0.7}
                      disabled={loading}
                    >
                      <View style={styles.reasonHeader}>
                        <View style={styles.radioButton}>
                          {selectedReason === reason.key && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.reasonLabel,
                            selectedReason === reason.key &&
                              styles.reasonLabelSelected,
                          ]}
                        >
                          {reason.label}
                        </Text>
                      </View>
                      <Text style={styles.reasonDescription}>
                        {reason.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Message */}
                <View style={styles.messageContainer}>
                  <Text style={styles.messageLabel}>
                    Additional Details{" "}
                    {selectedReason === "other" && (
                      <Text style={styles.required}>*</Text>
                    )}
                  </Text>
                  <TextInput
                    style={styles.messageInput}
                    placeholder={
                      selectedReason === "other"
                        ? "Please provide details about your reason..."
                        : "Optional: Add more details for the customer..."
                    }
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={customMessage}
                    onChangeText={setCustomMessage}
                    editable={!loading}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {!showDeclineForm ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.declineButton]}
                  onPress={() => setShowDeclineForm(true)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color="#dc3545"
                  />
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={handleApprove}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowDeclineForm(false);
                    setSelectedReason(null);
                    setCustomMessage("");
                  }}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    (!canSubmitDecline || loading) &&
                      styles.submitButtonDisabled,
                  ]}
                  onPress={handleDecline}
                  activeOpacity={0.7}
                  disabled={!canSubmitDecline || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>Submit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ReopeningResponseModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "95%",
    minHeight: "80%",
    marginHorizontal: 10,
    marginVertical: 20,
    overflow: "hidden",
    width: "95%",
    maxWidth: 500,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    minHeight: 200,
  },
  infoCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  messageCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#A40C2D",
  },
  messageText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  declineMessageCard: {
    borderLeftColor: "#dc3545",
    backgroundColor: "#fff5f5",
  },
  declineReasonText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e6f3ff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: "#0066cc",
    lineHeight: 18,
  },
  formInstruction: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 16,
  },
  reasonsContainer: {
    marginBottom: 20,
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  reasonOptionSelected: {
    borderColor: "#A40C2D",
    backgroundColor: "#fff5f7",
    borderWidth: 2,
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#999",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#A40C2D",
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  reasonLabelSelected: {
    color: "#A40C2D",
  },
  reasonDescription: {
    fontSize: 13,
    color: "#666",
    marginLeft: 30,
  },
  messageContainer: {
    marginBottom: 20,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#dc3545",
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
    backgroundColor: "#fff",
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  declineButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dc3545",
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#dc3545",
  },
  approveButton: {
    backgroundColor: "#28a745",
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#dc3545",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
