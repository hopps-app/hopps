import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface NewItemProps {
    color?: string;
}

export default function NewItemButton({ color }:NewItemProps){
    const colorScheme = useColorScheme();
    console.log(colorScheme);
    return (
        <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <Ionicons name='add-circle-outline' size={68} color={color ?? Colors[colorScheme ?? 'light'].text} />
        </View>);
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0, // space from bottombar
        height: 68,
        width: 68,
        borderRadius: 68,
        justifyContent: 'center',
        alignItems: 'center',
    },
});