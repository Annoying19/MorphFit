import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = "http://192.168.1.8:5000";
const TECH_API_URL = "http://172.16.100.209:5000";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedEvent, setSelectedEvent] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [wardrobeImages, setWardrobeImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('user_id');
      setUserId(id);
      if (id) fetchImages(id);
      else Alert.alert("Error", "User ID not found. Please login again.");
    };
    loadUserId();
  }, []);

  const fetchImages = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`${TECH_API_URL}/images/user/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch wardrobe images: ${response.statusText}`);
      const data = await response.json();
      setWardrobeImages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching wardrobe images:', error);
      Alert.alert("Error", "Failed to fetch wardrobe images.");
      setWardrobeImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (!selectedEvent) {
      Alert.alert("Error", "Please select an event type.");
      return;
    }

    if (!selectedOption) {
      Alert.alert("Error", "Please choose between 'Wardrobe' or 'Popular Outfits'.");
      return;
    }

    setModalVisible(false);

    try {
      setLoading(true);
      const requestBody = {
        event: selectedEvent,
        user_id: parseInt(userId),
      };

      const response = await fetch(`${TECH_API_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        router.push({
          pathname: '/wardrobeResults',
          params: { event: selectedEvent },
        });
      } else {
        Alert.alert("Error", data.error || "Failed to get recommendations.");
      }
    } catch (error) {
      console.error("❌ Error fetching recommendations:", error);
      Alert.alert("Error", "Failed to fetch recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.homeTitle}>Home</Text>

        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Event type</Text>
          <View style={styles.separator} />
          <Picker
            selectedValue={selectedEvent}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedEvent(itemValue)}
          >
            <Picker.Item label="-- Select an event --" value="" color="#000" enabled={false} />
            {[
              "Beach", "Birthday", "Business Meeting", "Casual", "Cold Season", "Funeral",
              "Gala", "Graduations", "Job Interviews", "Picnic", "Romantic Dinner", "Summer", "Wedding",
            ]
              .sort()
              .map((event) => (
                <Picker.Item key={event} label={event} value={event} />
              ))}
          </Picker>
        </View>

        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.searchButtonText}>Recommend</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>🧍 Virtual Wardrobe Summary</Text>
          <Text style={styles.summaryItem}>🧥 Total Items: {wardrobeImages.length}</Text>
          <Text style={styles.summaryItem}>🗂 Categories Used: 1</Text>
          <Text style={styles.summaryItem}>💾 Outfits Saved: 0</Text>
        </View>

        <Modal visible={modalVisible} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => {
            setModalVisible(false);
            setSelectedOption(null);
          }}>
            <View style={styles.modalContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalText}>User's Wardrobe or Popular Outfits?</Text>

                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      selectedOption === 'wardrobe' && styles.selectedOption,
                    ]}
                    onPress={() => setSelectedOption('wardrobe')}
                  >
                    <Text style={styles.modalOptionText}>Wardrobe</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      selectedOption === 'popular' && styles.selectedOption,
                    ]}
                    onPress={() => setSelectedOption('popular')}
                  >
                    <Text style={styles.modalOptionText}>Popular Outfits</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.searchButton} onPress={handleRecommend}>
                    <Text style={styles.searchButtonText}>Recommend</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, pathname.includes('/home') && styles.activeButton]}
          onPress={() => router.push('/home')}
        >
          <Icon name="home" size={28} color={pathname.includes('/home') ? "#007BFF" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, pathname.includes('/savedOutfits') && styles.activeButton]}
          onPress={() => router.push('/savedOutfits')}
        >
          <Icon name="bookmark-outline" size={28} color={pathname.includes('/savedOutfits') ? "#007BFF" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, pathname.includes('/wardrobe') && styles.activeButton]}
          onPress={() => router.push('/wardrobe')}
        >
          <Icon name="grid-outline" size={28} color={pathname.includes('/wardrobe') ? "#007BFF" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, pathname.includes('/settings') && styles.activeButton]}
          onPress={() => router.push('/settings')}
        >
          <Icon name="settings-outline" size={28} color={pathname.includes('/settings') ? "#007BFF" : "#000"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  homeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    alignSelf: 'left',
    marginBottom: 20,
  },
  dropdownContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#ccc',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 6,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  picker: {
    height: 55,
    width: '100%',
    backgroundColor: '#f9f9f9',
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 12,
    width: '80%',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#f9f9f9',
    padding: 25,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ccc',
    alignItems: 'center',
    width: 300,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  modalText: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalOption: {
    paddingVertical: 12,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedOption: { backgroundColor: 'gray' },
  summaryCard: {
    backgroundColor: '#f4f4f4',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 100,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  summaryItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
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
