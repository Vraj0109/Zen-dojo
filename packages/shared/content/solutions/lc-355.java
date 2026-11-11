import java.util.*;

class Twitter {
    private int clock = 0;
    private final Map<Integer, List<int[]>> tweets = new HashMap<>();
    private final Map<Integer, Set<Integer>> follows = new HashMap<>();

    public Twitter() {}

    public void postTweet(int userId, int tweetId) {
        tweets.computeIfAbsent(userId, k -> new ArrayList<>()).add(new int[]{clock++, tweetId});
    }

    public int[] getNewsFeed(int userId) {
        List<int[]> pool = new ArrayList<>();
        addLast10(userId, pool);
        Set<Integer> fSet = follows.get(userId);
        if (fSet != null) {
            for (int f : fSet) addLast10(f, pool);
        }
        pool.sort((a, b) -> Integer.compare(b[0], a[0]));
        int count = Math.min(pool.size(), 10);
        int[] feed = new int[count];
        for (int i = 0; i < count; i++) feed[i] = pool.get(i)[1];
        return feed;
    }

    private void addLast10(int u, List<int[]> pool) {
        List<int[]> v = tweets.get(u);
        if (v == null) return;
        int start = Math.max(0, v.size() - 10);
        for (int i = start; i < v.size(); i++) pool.add(v.get(i));
    }

    public void follow(int followerId, int followeeId) {
        follows.computeIfAbsent(followerId, k -> new HashSet<>()).add(followeeId);
    }

    public void unfollow(int followerId, int followeeId) {
        Set<Integer> fSet = follows.get(followerId);
        if (fSet != null) fSet.remove(followeeId);
    }
}
