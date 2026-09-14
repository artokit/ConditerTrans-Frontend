import { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CloseIcon } from '../Icons/Icons';
import { Button, FieldLabel, Input } from '../ui/Ui';
import { colors } from '../../theme/colors';
import { createRejectionReason, fetchRejectionReasons } from '../../api/rejectionReasons';
import type { RejectionReason } from '../../types';

interface DispatcherRejectModalProps {
  visible: boolean;
  orderLabel: string;
  onClose: () => void;
  onSubmit: (reasonId: string) => Promise<void>;
}

export function DispatcherRejectModal({
  visible,
  orderLabel,
  onClose,
  onSubmit,
}: DispatcherRejectModalProps) {
  const [reasons, setReasons] = useState<RejectionReason[]>([]);
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [showCustomReason, setShowCustomReason] = useState(false);
  const [customReason, setCustomReason] = useState('');
  const [creatingReason, setCreatingReason] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoadingReasons(true);
    setError('');

    fetchRejectionReasons()
      .then((items) => {
        if (!cancelled) setReasons(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить причины отказа');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReasons(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedReasonId) {
      setError('Выберите причину отказа');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(selectedReasonId);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отклонить заказ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReason = async () => {
    const name = customReason.trim();
    if (name.length < 3) {
      setError('Своя причина должна содержать не менее 3 символов');
      return;
    }

    setError('');
    setCreatingReason(true);
    try {
      const created = await createRejectionReason(name);
      setReasons((current) => [...current, created]);
      setSelectedReasonId(created.id);
      setCustomReason('');
      setShowCustomReason(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить причину');
    } finally {
      setCreatingReason(false);
    }
  };

  const resetForm = () => {
    setSelectedReasonId('');
    setShowCustomReason(false);
    setCustomReason('');
    setError('');
  };

  const handleClose = () => {
    if (submitting || creatingReason) return;
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Отказ от заказа</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <CloseIcon />
            </Pressable>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>
              {orderLabel}. Заказ будет переведён в статус «Отклонён», причина уйдёт менеджеру по
              закупкам.
            </Text>
            <FieldLabel>Причина отказа (обязательно):</FieldLabel>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={selectedReasonId}
                enabled={!loadingReasons && !submitting}
                onValueChange={(value) => {
                  setSelectedReasonId(String(value));
                  setError('');
                }}
              >
                <Picker.Item
                  label={loadingReasons ? 'Загрузка причин...' : 'Выберите причину'}
                  value=""
                />
                {reasons.map((item) => (
                  <Picker.Item
                    key={item.id}
                    label={item.isDefault ? item.name : `${item.name} (своя)`}
                    value={item.id}
                  />
                ))}
              </Picker>
            </View>

            {!showCustomReason ? (
              <Pressable style={styles.addReasonButton} onPress={() => setShowCustomReason(true)}>
                <Text style={styles.addReasonText}>+ Добавить свою причину</Text>
              </Pressable>
            ) : (
              <View style={styles.customReasonBlock}>
                <FieldLabel>Новая причина:</FieldLabel>
                <Input
                  value={customReason}
                  onChangeText={setCustomReason}
                  placeholder="Например: оборудование находится на ремонте"
                  maxLength={250}
                  editable={!creatingReason}
                />
                <View style={styles.customReasonActions}>
                  <Button
                    title="Отмена"
                    variant="secondary"
                    onPress={() => {
                      setShowCustomReason(false);
                      setCustomReason('');
                      setError('');
                    }}
                    disabled={creatingReason}
                  />
                  <Button
                    title={creatingReason ? 'Сохранение...' : 'Добавить'}
                    onPress={handleCreateReason}
                    loading={creatingReason}
                  />
                </View>
              </View>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            <Button title="Отмена" variant="secondary" onPress={handleClose} disabled={submitting} />
            <Button
              title={submitting ? 'Отправка...' : 'Подтвердить отказ'}
              variant="danger"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!selectedReasonId || loadingReasons || creatingReason}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 20 },
  body: { padding: 16 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  addReasonButton: { paddingVertical: 14 },
  addReasonText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  customReasonBlock: { marginTop: 12, gap: 8 },
  customReasonActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  error: { color: colors.error, marginTop: 8, fontSize: 13 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
