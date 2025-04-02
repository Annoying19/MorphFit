import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const API_URL = "http://192.168.1.8:5000";

const TECH_API_URL = "http://172.16.100.209:5000";
export default function OutfitDetails() {
  const router = useRouter();
  const { images, probabilities, feature_embeddings, self_attention_embeddings, cross_attention_embeddings, global_attention_embeddings } = useLocalSearchParams();

  const outfitImages = JSON.parse(images || "[]");
  const eventScores = JSON.parse(probabilities || "{}");
  const featureEmbeddings = JSON.parse(feature_embeddings || "[]");
  const selfAttentionEmbeddings = JSON.parse(self_attention_embeddings || "[]");
  const crossAttentionEmbeddings = JSON.parse(cross_attention_embeddings || "[]");
  const globalAttentionEmbeddings = JSON.parse(global_attention_embeddings || "[]");

  const formatEmbeddings = (embeddings) => {
    if (!Array.isArray(embeddings) || embeddings.length === 0) return "No Data";
  
    return embeddings.map((emb, index) => {
      if (!Array.isArray(emb) || emb.length === 0) return `Embedding ${index}: No Data`;
  
      // Ensure only valid numeric values
      const validValues = emb.filter(v => typeof v === 'number' && !isNaN(v));
  
      if (validValues.length === 0) return `Embedding ${index}: No Numeric Data`;
  
      // Extract first 10 and last 10 values
      const firstTen = validValues.slice(0, 10).map(v => v.toFixed(4)).join(", ");
      const lastTen = validValues.slice(-10).map(v => v.toFixed(4)).join(", ");
  
      return `Embedding ${index}: [${firstTen} ... ${lastTen}]`;
    }).join("\n\n");
  };
  
  

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Outfit Details</Text>

      {/* Display Outfit Images */}
      <ScrollView horizontal contentContainerStyle={styles.imageContainer}>
        {outfitImages.map((imagePath, index) => (
          <Image 
            key={index} 
            source={{ uri: `${TECH_API_URL}/uploads/${imagePath}` }} 
            style={styles.outfitImage} 
          />
        ))}
      </ScrollView>

      {/* Display Event Probabilities */}
      <View style={styles.probabilityContainer}>
        <Text style={styles.probabilityHeader}>Event Probabilities</Text>
        {Object.entries(eventScores).map(([eventName, probability]) => (
          <Text key={eventName} style={styles.probabilityText}>
            {eventName}: {(probability * 100).toFixed(2)}%
          </Text>
        ))}
      </View>

      {/* Display Embeddings (Formatted) */}
      <View style={styles.embeddingContainer}>
        <Text style={styles.embeddingHeader}>Feature Embeddings</Text>
        <Text style={styles.embeddingText}>{formatEmbeddings(featureEmbeddings)}</Text>

        <Text style={styles.embeddingHeader}>Self-Attention Embeddings</Text>
        <Text style={styles.embeddingText}>{formatEmbeddings(selfAttentionEmbeddings)}</Text>

        <Text style={styles.embeddingHeader}>Cross-Attention Embeddings</Text>
        <Text style={styles.embeddingText}>{formatEmbeddings(crossAttentionEmbeddings)}</Text>

        <Text style={styles.embeddingHeader}>Global Attention Embeddings</Text>
        <Text style={styles.embeddingText}>{formatEmbeddings(globalAttentionEmbeddings)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  backButton: { marginBottom: 10 },
  backText: { fontSize: 18, color: 'blue' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  imageContainer: { flexDirection: "row", marginBottom: 20 },
  outfitImage: { width: 120, height: 120, borderRadius: 10, marginRight: 10 },
  probabilityContainer: { marginTop: 10 },
  probabilityHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  probabilityText: { fontSize: 16, marginVertical: 3 },
  embeddingContainer: { marginTop: 10 },
  embeddingHeader: { fontSize: 16, fontWeight: "bold", marginTop: 10 },
  embeddingText: { fontSize: 12, color: "gray", marginVertical: 5, fontFamily: "monospace" },
});
