import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PopularResults() {
  const router = useRouter();
  const { event } = useLocalSearchParams(); // Get event category

  // Sample outfit data (Replace with real images later)
  const outfits = [
    [
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
    ],
    [
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
    ],
    [
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
    ],
    [
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
      'https://via.placeholder.com/100',
    ],
  ];

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Popular Outfits for {event ? event : 'Event'}</Text>
      </View>

      {/* Header */}
      <Text style={styles.subHeader}>Recommended Outfits</Text>

      {/* Scrollable Outfit Grid */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {outfits.map((outfit, index) => (
          <View key={index} style={styles.outfitContainer}>
            {outfit.map((item, itemIndex) => (
              <Image key={itemIndex} source={{ uri: item }} style={styles.clothingImage} />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    paddingHorizontal: 20, 
    paddingTop: 15, 
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1, // Ensures text is properly positioned
  },
  subHeader: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 15, 
  },
  scrollContainer: { 
    alignItems: 'center', 
    paddingBottom: 100, 
  },
  outfitContainer: { 
    width: '90%', 
    aspectRatio: 1, 
    backgroundColor: '#f9f9f9', 
    marginBottom: 15, 
    borderRadius: 10, 
    padding: 10,
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  clothingImage: { 
    width: '48%', // More balanced grid
    height: '48%', 
    borderRadius: 5, 
  },
  saveButton: { 
    position: 'absolute', 
    bottom: 20, 
    alignSelf: 'center', 
    backgroundColor: '#000', 
    paddingVertical: 12, 
    paddingHorizontal: 50, 
    borderRadius: 25, 
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold', 
  },
});
