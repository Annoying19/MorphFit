import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Wardrobe() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState(null);

  const categories = [
    { name: 'Tops', route: 'Tops' },
    { name: 'Bottoms', route: 'Bottoms' },
    { name: 'Shoes', route: 'Shoes' },
    { name: 'Outerwear', route: 'Outerwear' },
    { name: 'All-wear', route: 'All-wear' },
    { name: 'Accessories', route: 'Accessories' },
    { name: 'Hats', route: 'Hats' },
    { name: 'Sunglasses', route: 'Sunglasses' },
  ];

  useEffect(() => {
    const fetchUserId = async () => {
      const storedUserId = await AsyncStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      } else {
        Alert.alert('Error', 'User ID not found. Please log in again.');
      }
    };
    fetchUserId();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wardrobe</Text>
        </View>

        {/* Upload Button */}
        <TouchableOpacity onPress={() => {
          if (userId) {
            router.push({ pathname: '/uploadImage', params: { userId: userId, selectedCategory: 'Tops' } });
          } else {
            Alert.alert('Error', 'Missing user ID.');
          }
        }}>
          <Text style={styles.uploadText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Category Buttons */}
      <ScrollView contentContainerStyle={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.name}
            style={styles.categoryButton}
            onPress={() => router.push({ pathname: '/categoryWear', params: { category: category.route } })}
          >
            <Text style={styles.buttonText}>{category.name}</Text>
            <Icon name="chevron-forward-outline" size={24} color="#000" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, pathname.includes('/home') && styles.activeButton]}
          onPress={() => router.push('/home')}>
          <Icon name="home-outline" size={28} color={pathname.includes('/home') ? "#007BFF" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, pathname.includes('/savedOutfits') && styles.activeButton]}
          onPress={() => router.push('/savedOutfits')}>
          <Icon name="bookmark-outline" size={28} color={pathname.includes('/savedOutfits') ? "#007BFF" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, pathname.includes('/wardrobe') && styles.activeButton]}
          onPress={() => router.push('/wardrobe')}>
          <Icon name="grid-outline" size={28} color={pathname.includes('/wardrobe') ? "#007BFF" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, pathname.includes('/settings') && styles.activeButton]}
          onPress={() => router.push('/settings')}>
          <Icon name="settings-outline" size={28} color={pathname.includes('/settings') ? "#007BFF" : "#000"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingBottom: 80 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007BFF',
  },

  categoryContainer: { paddingVertical: 20, paddingHorizontal: 15 },
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },

  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    elevation: 5,
    borderRadius: 15,
    height: 70,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '25%',
  },
});
