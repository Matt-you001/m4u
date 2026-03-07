import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { IconButton, Snackbar } from 'react-native-paper';

type Props = {
  text: string;
  canWhatsApp?: boolean;
  canTelegram?: boolean;
};

export default function MessageActions({
  text,
  canWhatsApp = true,
  canTelegram = true,
}: Props) {
  const [toast, setToast] = useState('');
  const [visible, setVisible] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setVisible(true);
  };

  const copyText = async () => {
    await Clipboard.setStringAsync(text);
    showToast('Copied to clipboard');
  };

  const sendWhatsApp = () => {
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
    showToast('Opening WhatsApp');
  };

  const sendTelegram = () => {
    Linking.openURL(`tg://msg?text=${encodeURIComponent(text)}`);
    showToast('Opening Telegram');
  };

  const sendSMS = () => {
    Linking.openURL(`sms:?body=${encodeURIComponent(text)}`);
    showToast('Opening Messages');
  };

  const shareText = async () => {
    await Share.share({ message: text });
    showToast('Share sheet opened');
  };

  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton icon="content-copy" onPress={copyText} />
        <IconButton
          icon="whatsapp"
          disabled={!canWhatsApp}
          onPress={sendWhatsApp}
        />
        <IconButton
          icon="send"
          disabled={!canTelegram}
          onPress={sendTelegram}
        />
        <IconButton icon="message-text" onPress={sendSMS} />
        <IconButton icon="share-variant" onPress={shareText} />
      </View>

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
