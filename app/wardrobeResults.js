import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign } from '@expo/vector-icons'; // Heart icon

const API_URL = "http://192.168.1.8:5000"; // Flask API URL
const TECH_API_URL = "http://172.16.100.209:5000";
const { width } = Dimensions.get('window'); // Get screen width

export default function WardrobeResults() {
  const { event, wardrobeImages } = useLocalSearchParams();
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedOutfits, setSavedOutfits] = useState({});
  const router = useRouter(); 

  useEffect(() => {
    fetchOutfits();
  }, []);

  const fetchOutfits = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        setError("User not found. Please login again.");
        return;
      }
  
      const response = await axios.post(`${TECH_API_URL}/recommend`, {
        event: event,
        user_id: parseInt(userId), // Ensure user_id is sent as an integer
      });
  
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
  
      setOutfits(Array.isArray(response.data.results) ? response.data.results : []);
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error);
      setError("Failed to fetch recommendations.");
    } finally {
      setLoading(false);
    }
  };
  

  const handleOutfitPress = (outfit) => {
    router.push({
      pathname: "/outfitDetails",
      params: {
        images: JSON.stringify(outfit.outfit),
        probabilities: JSON.stringify(outfit.scores),
      },
    });
  };

  const toggleSaveOutfit = async (index, outfit) => {
    const userId = await AsyncStorage.getItem('user_id');
    const isSaved = savedOutfits[index];
  
    const cleanedOutfit = outfit.outfit.map(url => url.replace(TECH_API_URL, ''));
  
    if (!isSaved) {
      // Save outfit to DB
      await axios.post(`${TECH_API_URL}/save_outfit`, {
        user_id: userId,
        outfit: cleanedOutfit,
        event: event
      });
    } else {
      // Remove outfit from DB
      await axios.post(`${TECH_API_URL}/remove_outfit`, {
        user_id: userId,
        outfit: cleanedOutfit,
        event: event
      });
    }
  
    // Toggle local saved state
    setSavedOutfits(prev => ({
      ...prev,
      [index]: !isSaved,
    }));
  };
  


  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recommended Outfits for {event}</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : outfits.length === 0 ? (
        <Text style={styles.noOutfitsText}>No outfits found.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {outfits.map((outfit, index) => (
            <View key={index} style={styles.outfitWrapper}>
              <TouchableOpacity 
                style={styles.outfitContainer} 
                onPress={() => handleOutfitPress(outfit)}
              >
                <View style={styles.gridContainer}>
                  {Array.isArray(outfit.outfit) && outfit.outfit.length > 0 ? (
                    outfit.outfit.map((imageUrl, itemIndex) => (
                      <Image 
                        key={itemIndex} 
                        source={{ uri: imageUrl }} 
                        style={styles.clothingImage} 
                      />
                    ))
                  ) : (
                    <Text style={styles.errorText}>Invalid outfit data</Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* ❤️ Heart Button */}
              <TouchableOpacity 
                onPress={() => toggleSaveOutfit(index, outfit)} 
                style={styles.heartIcon}
              >
                <AntDesign 
                  name={savedOutfits[index] ? "heart" : "hearto"} 
                  size={24} 
                  color={savedOutfits[index] ? "red" : "gray"} 
                />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 15 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: "center" },
  errorText: { textAlign: "center", fontSize: 16, marginTop: 20, color: "red" },
  noOutfitsText: { textAlign: "center", fontSize: 16, marginTop: 20, color: "gray" },
  scrollContainer: { alignItems: 'center', paddingBottom: 100 },

  outfitWrapper: {
    width: '100%', 
    marginBottom: 20, 
    position: 'relative'
  },

  /** 📌 Outfit Card **/
  outfitContainer: { 
    backgroundColor: '#f9f9f9', 
    borderRadius: 10, 
    padding: 10, 
    alignItems: "center"
  },

  /** 📌 Grid for Outfits **/
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: width * 0.9, 
  },

  /** 📌 Square Clothing Image **/
  clothingImage: { 
    width: width * 0.42, 
    height: width * 0.42, 
    borderRadius: 5, 
    margin: 5,
  },

  /** ❤️ Heart Icon **/
  heartIcon: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    elevation: 3,
  }
});
