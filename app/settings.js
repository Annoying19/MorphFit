import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';

export default function Settings() {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => router.push('/login') },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header with Back Arrow */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-back-outline" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.header}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <Text style={styles.username}>PotatoCorner123</Text>
          <TouchableOpacity>
            <Icon name="create-outline" size={20} color="#000" style={styles.editIcon} />
          </TouchableOpacity>
        </View>

        {/* Settings Menu */}
        <View style={styles.menuContainer}>
          {['About Us', 'Help', 'How to use'].map((item, index) => (
            <View key={index}>
              <TouchableOpacity style={styles.menuItem} onPress={() => toggleSection(item)}>
                <Text style={styles.menuText}>{item}</Text>
              </TouchableOpacity>
              {expandedSection === item && (
                <Text style={styles.expandedText}>
                  {item === 'About Us'
                    ? 'We help users find the best outfit recommendations for different events.'
                    : item === 'Help'
                    ? 'For assistance, contact support@example.com or check our FAQ section.'
                    : 'Choose an event type and get instant outfit recommendations!'}
                </Text>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/home')}
        >
          <Icon name="home-outline" size={28} color={pathname.includes('/home') ? '#000' : '#888'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/savedOutfits')}
        >
          <Icon name="bookmark-outline" size={28} color={pathname.includes('/savedOutfits') ? '#000' : '#888'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/wardrobe')}
        >
          <Icon name="grid-outline" size={28} color={pathname.includes('/wardrobe') ? '#000' : '#888'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/settings')}
        >
          <Icon name="settings" size={28} color="#007BFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { padding: 20, paddingBottom: 100 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  editIcon: { padding: 5 },

  menuContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    elevation: 1,
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  menuText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expandedText: {
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    fontSize: 14,
    color: '#333',
  },
  logoutText: {
    color: '#D9534F',
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
