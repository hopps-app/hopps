import { ComponentPropsWithoutRef, ElementRef, forwardRef } from "react";
import { Platform, TextInput, StyleSheet } from 'react-native';
import { cn } from "@/lib/utils";

const Input = forwardRef<
  ElementRef<typeof TextInput>,
  ComponentPropsWithoutRef<typeof TextInput>
>(({ className, placeholderClassName, ...props }, ref) => {
  return (
    <TextInput
        ref={ref}
        className={cn(
            "web:flex h-10 native:h-12 w-full " +
            "rounded-md border border-[#A7A7A7]" +
            " bg-background px-3 web:py-2 text-base" +
            " lg:text-sm native:text-lg native:leading-[1.25] " +
            "text-foreground web:ring-offset-background file:border-0 " +
            "file:bg-transparent file:font-medium web:focus-visible:outline-none " +
            "web:focus-visible:ring-1 web:focus-visible:ring-ring" +
            " web:focus-visible:ring-offset-0 " +
            "web:shadow-[2px_2px_20px_0px_#00000026]",
            props.editable === false && "opacity-50 web:cursor-not-allowed",
            className
        )}
        placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
        style={[
            Platform.select({
                native: shadowStyles.nativeShadow
            }),
        ]}
        {...props}
    />
  );
});

const shadowStyles = StyleSheet.create({
    nativeShadow: {
        shadowColor: '#000000', // Shadow color
        shadowOpacity: 0.15, // Equivalent to transparency in the web (#00000026 = 15%)
        shadowOffset: { width: 2, height: 2 }, // Offset of shadow (matches `2px 2px`)
        shadowRadius: 10, // Blur radius for shadow (matches `20px / 2`)
        elevation: 5, // Android-specific shadow depth
    },
});


Input.displayName = "Input";

export { Input };
