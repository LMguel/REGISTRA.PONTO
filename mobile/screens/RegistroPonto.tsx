import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import axios from 'axios';

type RegistroPontoProps = NativeStackScreenProps<any, any>;

export default function RegistroPonto({ navigation }: RegistroPontoProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const registrarPonto = async () => {
    if (!cameraRef.current) return;

    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      const base64Img = photo.base64;

      const response = await axios.post('http://localhost:5000/api/registro_ponto', {
        foto: base64Img,
      });

      if (response.data.success) {
        const { nome, horario } = response.data;
        // Formata data DD-MM-AAAA e horário HH:mm:ss
        const dataFormatada = new Date(horario).toLocaleDateString('pt-BR');
        const horaFormatada = new Date(horario).toLocaleTimeString('pt-BR');
        setMessage(`Registro de ${nome} realizado em ${dataFormatada} às ${horaFormatada}`);
      } else {
        setMessage('Funcionário não reconhecido.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível registrar o ponto. Tente novamente.');
      setMessage('');
    }
    setLoading(false);
  };

  if (hasPermission === null) {
    return <View style={styles.center}><Text>Solicitando permissão da câmera...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.center}><Text>Permissão para usar a câmera negada.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={CameraType.front}
        ref={cameraRef}
        onCameraReady={() => setCameraReady(true)}
      />
      <View style={styles.buttons}>
        <Button title={loading ? 'Registrando...' : 'Registrar Ponto'} onPress={registrarPonto} disabled={!cameraReady || loading} />
        <Button title="Cadastrar Funcionário" onPress={() => navigation.navigate('CadastroFuncionario')} />
      </View>
      <View style={styles.messageContainer}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 5 },
  buttons: {
    flex: 2,
    justifyContent: 'space-around',
    margin: 20,
  },
  messageContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  message: {
    fontSize: 16,
    color: 'green',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
