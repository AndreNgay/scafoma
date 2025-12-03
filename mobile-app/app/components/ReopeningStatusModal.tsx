import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReopeningStatusModalProps {
  visible: boolean;
  onClose: () => void;
  request: any;
  loading?: boolean;
}

const ReopeningStatusModal: React.FC<ReopeningStatusModalProps> = ({
  visible,
  onClose,
  request,
  loading = false,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ffa500';
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      default:
        return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'approved':
        return 'checkmark-circle-outline';
      case 'rejected':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Declined';
      default:
        return status;
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;

      return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
    } catch {
      return dateString;
    }
  };

  const getReasonLabel = (reasonKey: string) => {
    const reasonLabels: { [key: string]: string } = {
      missed_deadline: 'Missed Deadline',
      technical_issue: 'Technical Issue',
      payment_delay: 'Payment Delay',
      forgot_upload: 'Forgot to Upload',
      network_issue: 'Network Issue',
      busy_schedule: 'Busy Schedule',
      emergency: 'Emergency',
      misunderstood_timer: 'Misunderstood Timer',
      other: 'Other',
    };
    return reasonLabels[reasonKey] || reasonKey;
  };

  const getDeclineReasonLabel = (reasonKey: string) => {
    const reasonLabels: { [key: string]: string } = {
      too_many_requests: 'Too Many Requests',
      order_too_old: 'Order Too Old',
      policy_violation: 'Policy Violation',
      insufficient_reason: 'Insufficient Reason',
      repeated_offense: 'Repeated Offense',
      inventory_unavailable: 'Inventory Unavailable',
      other: 'Other',
    };
    return reasonLabels[reasonKey] || reasonKey;
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A40C2D" />
            <Text style={styles.loadingText}>Loading request status...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!request) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.backdropTouchable}
            onPress={onClose}
          />
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Request Status</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No reopening request found</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const statusColor = getStatusColor(request.status);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.backdropTouchable}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Reopening Request Status</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Ionicons
                name={getStatusIcon(request.status) as any}
                size={32}
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(request.status)}
              </Text>
            </View>

            {/* Request Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Request Details</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order ID:</Text>
                  <Text style={styles.infoValue}>#{request.order_id}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Requested:</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTime(request.requested_at || request.created_at)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Reason Type:</Text>
                  <Text style={styles.infoValue}>{getReasonLabel(request.request_type)}</Text>
                </View>
              </View>
            </View>

            {/* Request Message */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Message</Text>
              <View style={styles.messageCard}>
                <Text style={styles.messageText}>{request.request_message}</Text>
              </View>
            </View>

            {/* Response Section (if responded) */}
            {request.status !== 'pending' && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Concessionaire Response
                  </Text>
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Responded:</Text>
                      <Text style={styles.infoValue}>
                        {formatDateTime(request.responded_at)}
                      </Text>
                    </View>
                    {request.status === 'approved' && (
                      <View style={styles.approvedMessageContainer}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#28a745"
                        />
                        <Text style={styles.approvedMessage}>
                          Your order has been reopened! Please upload your GCash receipt
                          within the required time.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {request.status === 'rejected' && request.response_message && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Decline Reason</Text>
                    <View style={[styles.messageCard, styles.declineMessageCard]}>
                      {request.response_type && (
                        <Text style={styles.declineReasonType}>
                          {getDeclineReasonLabel(request.response_type)}
                        </Text>
                      )}
                      <Text style={styles.declineMessageText}>
                        {request.response_message}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Pending Message */}
            {request.status === 'pending' && (
              <View style={styles.pendingInfoContainer}>
                <Ionicons name="information-circle-outline" size={20} color="#ffa500" />
                <Text style={styles.pendingInfoText}>
                  Your reopening request is being reviewed by the concessionaire. You will
                  be notified once they respond.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeFooterButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeFooterButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ReopeningStatusModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
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
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#999',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  messageCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#A40C2D',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  declineMessageCard: {
    borderLeftColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  declineReasonType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 6,
  },
  declineMessageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  approvedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9f4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 10,
  },
  approvedMessage: {
    flex: 1,
    fontSize: 13,
    color: '#28a745',
    lineHeight: 18,
  },
  pendingInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff9e6',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  pendingInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#cc8800',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  closeFooterButton: {
    backgroundColor: '#A40C2D',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
