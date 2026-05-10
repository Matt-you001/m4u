import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { IconButton, Snackbar } from 'react-native-paper';

type Props = {
  text: string;
  variant?: 'individual' | 'corporate';
  preferredPlatform?: string;
};

export default function MessageActions({
  text,
  variant = 'individual',
  preferredPlatform,
}: Props) {
  const [toast, setToast] = useState('');
  const [visible, setVisible] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setVisible(true);
  };

  const safeOpen = async (url: string, successMessage: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showToast('App not available on this device');
        return;
      }
      await Linking.openURL(url);
      showToast(successMessage);
    } catch {
      showToast('Could not open that app right now');
    }
  };

  const copyText = async () => {
    await Clipboard.setStringAsync(text);
    showToast('Copied to clipboard');
  };

  const sendWhatsApp = () => {
    safeOpen(`whatsapp://send?text=${encodeURIComponent(text)}`, 'Opening WhatsApp');
  };

  const sendTelegram = () => {
    safeOpen(`tg://msg?text=${encodeURIComponent(text)}`, 'Opening Telegram');
  };

  const sendSMS = () => {
    safeOpen(`sms:?body=${encodeURIComponent(text)}`, 'Opening Messages');
  };

  const sendEmail = () => {
    safeOpen(
      `mailto:?body=${encodeURIComponent(text)}`,
      'Opening Email'
    );
  };

  const shareText = async () => {
    await Share.share({ message: text });
    showToast(
      preferredPlatform
        ? `Share to ${preferredPlatform} or another app`
        : 'Share sheet opened'
    );
  };

  const corporateActions = (
    <View style={styles.row}>
      <IconButton icon="content-copy" onPress={copyText} />
      <IconButton icon="whatsapp" onPress={sendWhatsApp} />
      <IconButton icon="email-outline" onPress={sendEmail} />
      <IconButton icon="message-text" onPress={sendSMS} />
      <IconButton icon="share-variant" onPress={shareText} />
    </View>
  );

  const individualActions = (
    <View style={styles.row}>
      <IconButton icon="content-copy" onPress={copyText} />
      <IconButton icon="whatsapp" onPress={sendWhatsApp} />
      <IconButton icon="send" onPress={sendTelegram} />
      <IconButton icon="message-text" onPress={sendSMS} />
      <IconButton icon="share-variant" onPress={shareText} />
    </View>
  );

  return (
    <>
      {variant === 'corporate' ? corporateActions : individualActions}

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={1500}
      >
        {toast}
      </Snackbar>
    </>
  );
}

const styles = {
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
};
