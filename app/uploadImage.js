import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, 
  Image, Alert, ScrollView, ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';

const API_URL = "http://192.168.1.8:5000"; // Flask API Server
const TECH_API_URL = "http://172.16.100.209:5000";

export default function UploadImage() {
  const { selectedCategory = 'Bottomwear', userId = null } = useLocalSearchParams(); // 🟢 fallback for userId
  const router = useRouter();

  const categories = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'All-wear', 'Accessories', 'Hats', 'Sunglasses'];
  const [category, setCategory] = useState(selectedCategory);
  const [imagesByCategory, setImagesByCategory] = useState({});
  const [selectedImages, setSelectedImages] = useState([]); 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("🟢 userId param:", userId); // Debug log
    fetchImages();
  }, [category]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${TECH_API_URL}/images/${category}`);
      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error("Invalid API response:", data);
        setImagesByCategory((prev) => ({ ...prev, [category]: [] }));
      } else {
        setImagesByCategory((prev) => ({ ...prev, [category]: data }));
      }
    } catch (error) {
      console.error("❌ Error fetching images:", error);
      Alert.alert("Error", "Failed to fetch images.");
      setImagesByCategory((prev) => ({ ...prev, [category]: [] }));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'You need to allow access to the library!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages((prev) => [...prev, ...newImages]);
      } else {
        Alert.alert('Selection Canceled', 'No image selected.');
      }
    } catch (error) {
      console.error('❌ Image Selection Error:', error);
      Alert.alert('Error', 'Failed to select images.');
    }
  };

  const handleUploadSelectedImages = async () => {
    if (!userId) {
      Alert.alert("❌ Error", "Missing user ID. Please log in again.");
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert("No Images Selected", "Please select images before uploading.");
      return;
    }
  
    setLoading(true);
  
    try {
      const formData = new FormData();
      selectedImages.forEach((imageUri, index) => {
        formData.append("images", {
          uri: imageUri,
          name: `upload_${index}.jpg`,
          type: "image/jpeg",
        });
      });
  
      formData.append("user_id", userId.toString()); // 🟢 Ensure it's a string
      formData.append("category", category);
  
      const response = await fetch(`${TECH_API_URL}/upload-multiple`, {
        method: "POST",
        body: formData,
        headers: {
          "Accept": "application/json",
        },
      });
  
      const resultData = await response.json();
      setLoading(false);
  
      if (response.ok) {
        Alert.alert("✅ Success", "Images uploaded successfully!");
        setSelectedImages([]);
        fetchImages();
        router.push('/home');
      } else {
        Alert.alert("❌ Error", resultData.error || "Upload failed");
      }
    } catch (error) {
      setLoading(false);
      console.error('❌ Image Upload Error:', error);
      Alert.alert('Error', 'Failed to upload images.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Upload a photo</Text>
      <Text style={styles.subtitle}>Afterwards, identify which item you uploaded</Text>

      <TouchableOpacity style={styles.uploadBox} onPress={handleSelectImages}>
        <Icon name="image-outline" size={40} color="#999" />
        <Text style={styles.uploadText}>Select Images</Text>
      </TouchableOpacity>

      <ScrollView horizontal style={styles.selectedImageList}>
        {selectedImages.map((imageUri, index) => (
          <Image key={index} source={{ uri: imageUri }} style={styles.selectedImage} />
        ))}
      </ScrollView>

      <Text style={styles.label}>Category</Text>
      <View style={styles.dropdownContainer}>
        <Picker
          selectedValue={category}
          style={styles.picker}
          onValueChange={(itemValue) => setCategory(itemValue)}
        >
          {categories.map((item, index) => (
            <Picker.Item key={index} label={item} value={item} />
          ))}
        </Picker>
      </View>

      {loading ? <ActivityIndicator size="large" /> : null}

      <TouchableOpacity style={styles.uploadButton} onPress={handleUploadSelectedImages} disabled={loading}>
        <Text style={styles.uploadButtonText}>{loading ? "Uploading..." : "Upload & Done"}</Text>
      </TouchableOpacity>

      <ScrollView style={styles.imageList} contentContainerStyle={{ alignItems: 'center' }}>
        {(imagesByCategory[category] || []).map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: `${TECH_API_URL}/uploads/${image.image_path}` }} style={styles.image} />
            <Text style={styles.imageLabel}>Image {index + 1}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  backButton: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  uploadBox: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', marginBottom: 20 },
  uploadText: { fontSize: 16, color: '#000', marginTop: 10 },
  selectedImageList: { flexDirection: 'row', marginBottom: 10 },
  selectedImage: { width: 80, height: 80, borderRadius: 8, marginRight: 5 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  dropdownContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 20 },
  picker: { height: 50, width: '100%' },
  uploadButton: { backgroundColor: '#000', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  imageList: { marginTop: 10, maxHeight: 200 },
  doneButton: { marginTop: 30, backgroundColor: '#000', paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
