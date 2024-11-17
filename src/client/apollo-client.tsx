import axios from "axios";
import {
  ApolloClient,
  ApolloProvider,
  createHttpLink,
  InMemoryCache,
  makeVar,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";

// Reactive variables for user authentication state
const isLoggedInVar = makeVar<boolean>(false);
const userDataVar = makeVar<UserData | null>(null);

const httpLink = createHttpLink({
  uri: "https://graphql.anilist.co",
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("accessToken");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  }
  if (networkError) console.error(`[Network error]: ${networkError}`);
});

const client = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
});

// Functions to handle authentication
const login = () => {
  axios.get("/get-csrf-token").then((response) => {
    const csrfToken = response.data.csrfToken;
    const authUrl = buildAuthUrl(csrfToken);
    window.location.href = authUrl;
  });
};

export const ApolloClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
