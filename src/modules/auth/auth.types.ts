export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    rating: number;
    wins: number;
    losses: number;
    racesCompleted: number;
  };
};
