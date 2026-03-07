let store: any;

export const setAuthStore = (value: any) => {
  store = value;
};

export const getAuthStore = () => store;
