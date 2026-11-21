import java.util.*;

class Twitter {
    private static class Tweet {
        int userId, tweetId, time;
        Tweet(int u, int tw, int t) {
            userId = u;
            tweetId = tw;
            time = t;
        }
    }

    private int timer = 0;
    private final List<Tweet> allTweets = new ArrayList<>();
    private final Map<Integer, Set<Integer>> follows = new HashMap<>();

    public Twitter() {}

    public void postTweet(int userId, int tweetId) {
        allTweets.add(new Tweet(userId, tweetId, ++timer));
    }

    public List<Integer> getNewsFeed(int userId) {
        List<Tweet> feed = new ArrayList<>();
        Set<Integer> userFollows = follows.getOrDefault(userId, Collections.emptySet());
        for (Tweet tw : allTweets) {
            if (tw.userId == userId || userFollows.contains(tw.userId)) {
                feed.add(tw);
            }
        }
        feed.sort((a, b) -> Integer.compare(b.time, a.time));
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i < Math.min(10, feed.size()); i++) {
            res.add(feed.get(i).tweetId);
        }
        return res;
    }

    public void follow(int followerId, int followeeId) {
        follows.computeIfAbsent(followerId, k -> new HashSet<>()).add(followeeId);
    }

    public void unfollow(int followerId, int followeeId) {
        if (follows.containsKey(followerId)) {
            follows.get(followerId).remove(followeeId);
        }
    }
}
