import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/Text';
import { Input } from '@/components/Input';
import { Checkbox } from '@/components/Checkbox';
import React, { useContext, useState } from 'react';
import { Link } from 'expo-router';
import { Button } from '@/components/Button';
import Animated, { FadeIn, BounceInUp, FadeOut, BounceInDown, BounceInRight } from 'react-native-reanimated';
import { AuthContext, AuthProvider } from '@/contexts/AuthContext';

export default function LoginView() {

    const [checked, setChecked] = useState(false);
     const authContext = useContext(AuthContext);

    function login(){
        authContext?.setAuthState({
            accessToken: '<KEY>',
            refreshToken: '<KEY>',
            authenticated: true
        })
    }

    return (
        <View className='h-full w-full flex items-center justify-center'>
            <Animated.Image entering={BounceInDown.delay(200).duration(600).springify().damping(3)} width={240} height={60} source={require('@/assets/images/hopps-logo.png')} />
            <Text className='pt-5'>Welcome back! Please enter your valid data</Text>
            <View className='p-5 w-full'>

                <Animated.Text entering={BounceInRight.delay(400).duration(600).springify()} className='pt-10 font-bold text-left w-full text-lg'>E-Mail</Animated.Text>
                <Input inputMode='email' keyboardType='email-address' className='w-full'></Input>
                <Animated.Text entering={BounceInRight.delay(500).duration(600).springify()} className='pt-10 font-bold text-left w-full text-lg'>Password</Animated.Text>
                <Input secureTextEntry={true} className='w-full'></Input>

                <View className="pt-10 flex flex-row items-center justify-between">
                    {/* Left side: Checkbox and Remember Me */}
                    <View className="flex flex-row items-center">
                        <Checkbox checked={checked} onCheckedChange={() => setChecked(!checked)} />
                        <Text className="pl-2">Remember me</Text>
                    </View>

                    {/* Right side: Forgot Password */}
                    <Link className="text-[#9955CC]" href="https://hopps.cloud">
                        Forgot password?
                    </Link>
                </View>

                <Button onPress={login} className="mt-10"><Text>Login</Text></Button>
            </View>
        </View>
    );
}