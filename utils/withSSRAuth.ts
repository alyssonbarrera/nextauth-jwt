import decode from "jwt-decode";
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { destroyCookie, parseCookies } from "nookies";
import { AuthTokenError } from "../services/errors/AuthTokenErro";
import { validadeUserPermissions } from "./validateUserPermissions";

type WithSSRAuthOptions = {
    permissions?: string[];
    roles?: string[];
}

export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: WithSSRAuthOptions): GetServerSideProps {
    return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
        const cookies = parseCookies(context);

        const token = cookies['nextauth.token']

        if(!token) {
            return {
                redirect: {
                    destination: '/',
                    permanent: false
                }
            }
        }

        if (options) {
            const user = decode<{permissions: string[], roles: string[]}>(token)

            const { permissions, roles } = options;
    
            const userHasValidPermissions = validadeUserPermissions({
                permissions,
                roles,
                user
            })

            if(!userHasValidPermissions) {
                return {
                    redirect: {
                        destination: '/dashboard',
                        permanent: false
                    }
                }
            }
        }


        try {
            return await fn(context);
        } catch (error) {
            if(error instanceof AuthTokenError) {

                destroyCookie(context, 'nextauth.token')
                destroyCookie(context, 'nextauth.refreshToken')
        
                return {
                    redirect: {
                        destination: '/',
                        permanent: false
                    }
                }
            }
        }
    }
}