import { StyleSheet, View, Pressable, Text, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

type Props = {
    label: string;
    onPress?: () => void;
};

export default function Button({ label, onPress}: Props) {
    const colorScheme = useColorScheme();

    return (
        <View style={styles.buttonContainer}>
            <Pressable style={styles.button} onPress={onPress}>
                <Text style={[styles.buttonLabel, {color: Colors[colorScheme ?? 'light'].text}]}>{label}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        width: 320,
        height: 68,
        marginHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
    },
    button: {
        borderRadius: 10,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    buttonLabel: {
        fontSize: 16,
    },
});
