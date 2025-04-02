import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        <Image source={require('../assets/logo.png')} style={styles.image} />
        <Text style={styles.title}>Welcome!</Text>
      </View>

      {/* Get Started Button at Bottom */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 300,
    height: 250,
    resizeMode: 'contain',
  },

  title: {
    fontSize: 26,
    fontWeight: '500',
    color: '#000',
    marginTop: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  button: {
    width: 200,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
