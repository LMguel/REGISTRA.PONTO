import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RegistroPonto from './screens/RegistroPonto';
import CadastroFuncionario from './screens/CadastroFuncionario';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="RegistroPonto">
        <Stack.Screen
          name="RegistroPonto"
          component={RegistroPonto}
          options={{ title: 'Registra Ponto' }}
        />
        <Stack.Screen
          name="CadastroFuncionario"
          component={CadastroFuncionario}
          options={{ title: 'Cadastro Funcionário' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
