import {create} from "zustand";
export const userAuthStore = create((set,get)=>({
    authUser: {name:""},
    isLoading:false,
    login:()=>{
        console.log("We logged in");
    },
}));