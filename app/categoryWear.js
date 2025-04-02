import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, 
  StyleSheet, Image, Alert, ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';

const API_URL = "http://192.168.1.8:5000"; // Flask Server IP

const TECH_API_URL = "http://172.16.100.209:5000";
export default function CategoryWear() {
  const router = useRouter();
  const { category } = useLocalSearchParams(); 
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  useEffect(() => {
    fetchImages();
  }, [category]);

  // ✅ Fetch Images
  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${TECH_API_URL}/images/${category}`);
      const data = await response.json();

      console.log(`Fetched Images for ${category}:`, data);
      setImages(data);
    } catch (error) {
      console.error(`Error fetching images for ${category}:`, error);
      Alert.alert("Error", `Failed to fetch images for ${category}.`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Toggle Image Selection in Delete Mode
  const toggleSelectImage = (id) => {
    if (selectedImages.includes(id)) {
      setSelectedImages(selectedImages.filter(imgId => imgId !== id));
    } else {
      setSelectedImages([...selectedImages, id]);
    }
  };

  // ✅ Delete Selected Images
  const deleteSelectedImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert("No Images Selected", "Please select images to delete.");
      return;
    }

    try {
      const response = await fetch(`${TECH_API_URL}/delete-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_ids: selectedImages })
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert("✅ Success", "Selected images deleted successfully.");
        setDeleteMode(false);
        setSelectedImages([]);
        fetchImages();
      } else {
        Alert.alert("❌ Error", result.error || "Failed to delete images.");
      }
    } catch (error) {
      console.error("❌ Delete Error:", error);
      Alert.alert("Error", "Failed to delete images.");
    }
  };

  // ✅ Delete All Images
  const deleteAllImages = async () => {
    try {
      const response = await fetch(`${TECH_API_URL}/delete-all/${category}`, { method: "DELETE" });
      const result = await response.json();
      
      if (response.ok) {
        Alert.alert("✅ Success", "All images deleted successfully.");
        setDeleteMode(false);
        setSelectedImages([]);
        fetchImages();
      } else {
        Alert.alert("❌ Error", result.error || "Failed to delete all images.");
      }
    } catch (error) {
      console.error("❌ Delete All Error:", error);
      Alert.alert("Error", "Failed to delete all images.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.header}>{category} Wear</Text>

        {/* Delete Mode Toggle */}
        <TouchableOpacity onPress={() => setDeleteMode(!deleteMode)} style={styles.deleteModeButton}>
          <Icon name={deleteMode ? "close-circle" : "trash"} size={24} color="red" />
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />}

      {/* Image Grid */}
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {images.length > 0 ? (
          images.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.imageContainer, selectedImages.includes(item.id) && styles.selectedImage]}
              onPress={() => deleteMode && toggleSelectImage(item.id)}
              onLongPress={() => setDeleteMode(true)} // Long press to enable delete mode
            >
              <Image 
                source={{ uri: item.image_path }} 
                style={styles.image} 
                onError={(e) => console.log("Failed to load image:", e.nativeEvent.error)}
              />
              {deleteMode && selectedImages.includes(item.id) && (
                <Icon name="checkmark-circle" size={24} color="green" style={styles.checkmark} />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noImagesText}>No {category} wear found</Text>
        )}
      </ScrollView>

      {/* Delete Controls */}
      {deleteMode && (
        <View style={styles.deleteControls}>
          <TouchableOpacity style={styles.deleteButton} onPress={deleteSelectedImages}>
            <Text style={styles.deleteButtonText}>Delete Selected</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={deleteAllImages}>
            <Text style={styles.deleteButtonText}>Delete All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 10 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  iconButton: { padding: 10 },
  deleteModeButton: { padding: 10 },
  header: { fontSize: 20, fontWeight: 'bold' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 100 },
  imageContainer: { width: '47%', aspectRatio: 1, marginBottom: 15, backgroundColor: '#f0f0f0', borderRadius: 10, overflow: 'hidden', position: 'relative' },
  selectedImage: { borderColor: "red", borderWidth: 3 },
  image: { width: '100%', height: '100%' },
  checkmark: { position: "absolute", top: 5, right: 5 },
  noImagesText: { textAlign: 'center', fontSize: 16, color: '#888', marginTop: 20 },
  deleteControls: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  deleteButton: { backgroundColor: "red", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: "center", flex: 1, marginHorizontal: 5 },
  deleteButtonText: { color: "#fff", fontWeight: "bold" },
});
