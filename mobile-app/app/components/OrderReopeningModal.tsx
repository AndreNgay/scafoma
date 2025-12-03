import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReopeningReason {
  key: string;
  label: string;
  description: string;
}

interface OrderReopeningModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reasonType: string, customMessage: string) => void;
  loading?: boolean;
}

const REOPENING_REASONS: ReopeningReason[] = [
  {
    key: 'missed_deadline',
    label: 'Missed Deadline',
    description: 'I missed the deadline for uploading the receipt',
  },
  {
    key: 'technical_issue',
    label: 'Technical Issue',
    description: 'I experienced technical issues with the app',
  },
  {
    key: 'payment_delay',
    label: 'Payment Delay',
    description: 'My payment was delayed',
  },
  {
    key: 'forgot_upload',
    label: 'Forgot to Upload',
    description: 'I forgot to upload the receipt',
  },
  {
    key: 'network_issue',
    label: 'Network Issue',
    description: 'I had network connectivity problems',
  },
  {
    key: 'busy_schedule',
    label: 'Busy Schedule',
    description: 'I was busy and couldn\'t upload in time',
  },
  {
    key: 'emergency',
    label: 'Emergency',
    description: 'I had an emergency situation',
  },
  {
    key: 'misunderstood_timer',
    label: 'Misunderstood Timer',
    description: 'I misunderstood the timer requirement',
  },
  {
    key: 'other',
    label: 'Other',
    description: 'Other reason (please specify below)',
  },
];

const OrderReopeningModal: React.FC<OrderReopeningModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmit(selectedReason, customMessage.trim());
  };

  const handleClose = () => {
    setSelectedReason(null);
    setCustomMessage('');
    onClose();
  };

  const canSubmit = selectedReason && (selectedReason !== 'other' || customMessage.trim().length > 0);

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
            <Text style={styles.headerTitle}>Request Order Reopening</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>
              Please select a reason for reopening this order:
            </Text>

            {/* Reason Options */}
            <View style={styles.reasonsContainer}>
              {REOPENING_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.key}
                  style={[
                    styles.reasonOption,
                    selectedReason === reason.key && styles.reasonOptionSelected,
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
                        selectedReason === reason.key && styles.reasonLabelSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </View>
                  <Text style={styles.reasonDescription}>{reason.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.messageLabel}>
                Additional Details {selectedReason === 'other' && <Text style={styles.required}>*</Text>}
              </Text>
              <TextInput
                style={styles.messageInput}
                placeholder={
                  selectedReason === 'other'
                    ? 'Please provide details about your reason...'
                    : 'Optional: Add more details to support your request...'
                }
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={customMessage}
                onChangeText={setCustomMessage}
                editable={!loading}
              />
              <Text style={styles.messageHint}>
                {selectedReason === 'other'
                  ? 'Please explain your reason for requesting to reopen this order'
                  : 'You can provide additional context to help the concessionaire understand your situation'}
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!canSubmit || loading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OrderReopeningModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '95%',
    minHeight: '80%',
    marginHorizontal: 10,
    marginVertical: 20,
    overflow: 'hidden',
    width: '95%',
    maxWidth: 500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
  },
  reasonsContainer: {
    marginBottom: 20,
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  reasonOptionSelected: {
    borderColor: '#A40C2D',
    backgroundColor: '#fff5f7',
    borderWidth: 2,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#A40C2D',
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  reasonLabelSelected: {
    color: '#A40C2D',
  },
  reasonDescription: {
    fontSize: 13,
    color: '#666',
    marginLeft: 30,
  },
  messageContainer: {
    marginBottom: 20,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    backgroundColor: '#fff',
  },
  messageHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#A40C2D',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
