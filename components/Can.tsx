import { ReactNode } from "react";
import { useCan } from "../hooks/useCan";

interface CanProps {
    children: ReactNode;
    permissions?: string[];
    roles?: string[];
}

export function Can({ children, permissions, roles }: CanProps) {

    if(permissions === undefined && roles === undefined) {
        return null;
    }

    const userCanSeeComponent = useCan({
        permissions,
        roles
    })

    if(!userCanSeeComponent) {
        return null;
    }

    return (
        <>
            { children }
        </>
    )
}