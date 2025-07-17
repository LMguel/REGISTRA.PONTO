import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Image, Pressable, Animated } from 'react-native';
import { CameraView, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import axios from 'axios';
import { Audio } from 'expo-av';

export default function RegistroPonto() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const playSound = async (type: 'success' | 'error') => {
    const { sound } = await Audio.Sound.createAsync(
      type === 'success'
        ? require('../assets/success.mp3')
        : require('../assets/error.mp3')
    );
    await sound.playAsync();
  };

  const playFlash = () => {
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const capturarERegistrar = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    playFlash();

    try {
      const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      setPhotoUri(photo.uri);

      const formData = new FormData();
      const filename = photo.uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('foto', {
        uri: photo.uri,
        name: filename,
        type,
      } as any);

      const response = await axios.post('http://192.168.1.108:5000/registrar_ponto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 10000,
      });

      if (response.data.success) {
        const { funcionario, hora } = response.data;
        const dataFormatada = new Date(hora).toLocaleDateString('pt-BR');
        const horaFormatada = new Date(hora).toLocaleTimeString('pt-BR');
        const msg = `✅ ${funcionario}\n${dataFormatada} às ${horaFormatada}`;
        setMessage(msg);
        playSound('success');
      } else {
        setMessage(response.data.message || '⚠️ Funcionário não reconhecido.');
        playSound('error');
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        setMessage('⏳ Tempo de conexão esgotado.');
      } else {
        setMessage('❌ Erro na conexão.');
      }
      playSound('error');
    }

    setModalVisible(true);
    setTimeout(() => {
      setModalVisible(false);
      setPhotoUri(null);
      setIsProcessing(false);
    }, 5000);
  };

  if (!permission) {
    return <View style={styles.center}><Text>Solicitando permissão...</Text></View>;
  }

  if (!permission.granted) {
    return <View style={styles.center}><Text>Permissão negada para usar a câmera.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.camera}
        onPress={capturarERegistrar}
        disabled={isProcessing}
      >
        <CameraView
          style={styles.camera}
          facing="front"
          ref={cameraRef}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flash,
            { opacity: flashOpacity }
          ]}
        />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text style={styles.modalText}>{message}</Text>
              {photoUri && (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 200, height: 300, marginTop: 10, borderRadius: 10 }}
                />
              )}
            </Card.Content>
          </Card>
        </View>
      </Modal>

      {isProcessing && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    opacity: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  modalText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#333',
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});