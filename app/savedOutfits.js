import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TECH_API_URL = "http://172.16.100.209:5000";

export default function SavedOutfits() {
  const router = useRouter();
  const pathname = usePathname();
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [frequentItemsets, setFrequentItemsets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedOutfits();
    fetchFPgrowth();
  }, []);

  const fetchSavedOutfits = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const response = await axios.get(`${TECH_API_URL}/get_saved_outfits`, {
        params: { user_id: userId }
      });
      setSavedOutfits(response.data.saved_outfits || []);
    } catch (error) {
      console.error('❌ Failed to fetch saved outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFPgrowth = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
  
      // Fetch frequent itemsets
      const response = await axios.get(`${TECH_API_URL}/fp_growth_saved`, {
        params: { user_id: userId }
      });
  
      if (response.data.frequent_itemsets) {
        // Fetch all images for this user
        const imagesRes = await axios.get(`${TECH_API_URL}/images/user/${userId}`);
        const allImages = imagesRes.data;
  
        // Map clothing IDs to image paths
        const mappedItemsets = response.data.frequent_itemsets.map((item, idx) => {
          const itemsWithImages = item.itemsets.map((clothingId, subIdx) => {
            const found = allImages.find(img => img.id === clothingId);
            return {
              key: `${clothingId}_${idx}_${subIdx}`,
              image_path: found ? `${TECH_API_URL}/uploads/${found.image_path}` : null
            };
          });
          return {
            key: `set_${idx}`,
            support: item.support,
            items: itemsWithImages
          };
        });
  
        setFrequentItemsets(mappedItemsets);
      }
    } catch (error) {
      console.error('❌ Failed to run FP-Growth:', error);
    }
  };
  

  const toggleLike = async (id) => {
    try {
      await axios.post(`${TECH_API_URL}/remove_outfit_by_id`, { id });
      setSavedOutfits(savedOutfits.filter(outfit => outfit.id !== id));
    } catch (err) {
      console.error('❌ Failed to remove saved outfit:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Saved Outfits</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {savedOutfits.map((outfit) => (
            <View key={outfit.id} style={styles.outfitContainer}>
              <View style={styles.outfitGrid}>
                {outfit.outfit.map((imagePath, imgIndex) => (
                  <Image 
                    key={`${outfit.id}_${imgIndex}`}
                    source={{ uri: `${TECH_API_URL}${imagePath}` }}
                    style={styles.outfitImage} 
                  />
                ))}
              </View>
              <TouchableOpacity 
                style={styles.heartButton} 
                onPress={() => toggleLike(outfit.id)}
              >
                <Icon name='heart' size={24} color={'#FF0000'} />
              </TouchableOpacity>
            </View>
          ))}
          {frequentItemsets.length > 0 && (
            <View style={styles.fpContainer}>
              <Text style={styles.fpTitle}>Frequent Combinations</Text>
              {frequentItemsets.map((item) => (
                <View key={item.key} style={{ marginBottom: 20 }}>
                  <Text style={styles.fpItem}>Support: {item.support.toFixed(2)}</Text>
                  <View style={styles.fpImageRow}>
                    {item.items.map(clothing => (
                      <View key={clothing.key} style={styles.fpImageWrapper}>
                        {clothing.image_path ? (
                          <Image
                            source={{ uri: clothing.image_path }}
                            style={styles.fpImage}
                          />
                        ) : (
                          <View style={[styles.fpImage, { backgroundColor: '#ccc' }]} />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      )}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, pathname.includes('/home') && styles.activeButton]} 
          onPress={() => router.push('/home')}
        >
          <Icon name="home-outline" size={28} color={pathname.includes('/home') ? "#007BFF" : "#000"} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navItem, pathname.includes('/savedOutfits') && styles.activeButton]} 
          onPress={() => router.push('/savedOutfits')}>
          <Icon name="bookmark" size={28} color={pathname.includes('/savedOutfits') ? "#007BFF" : "#000"} />
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
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  scrollContainer: { paddingHorizontal: 15, paddingBottom: 150 },
  outfitContainer: { backgroundColor: '#f5f5f5', marginBottom: 20, borderRadius: 10, padding: 10, position: 'relative', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  outfitGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  outfitImage: { width: '48%', aspectRatio: 1, borderRadius: 8, marginBottom: 8 },
  heartButton: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.8)', padding: 5, borderRadius: 50 },
  fpContainer: { padding: 15, backgroundColor: '#fff', marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  fpTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  fpItem: { fontSize: 14, color: '#333', marginBottom: 5 },
  fpImageRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  fpImageWrapper: { alignItems: 'center', marginRight: 10, marginBottom: 10 },
  fpImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  fpImageId: { fontSize: 10, marginTop: 3, color: '#555' },
  bottomNav: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 15, alignItems: 'center', justifyContent: 'space-evenly', elevation: 5, borderRadius: 15, height: 70, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  navItem: { alignItems: 'center', justifyContent: 'center', width: '25%' },
  fpImageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  fpImageWrapper: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.5%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fpImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  }
});
