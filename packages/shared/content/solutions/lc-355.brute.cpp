#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class Twitter {
    struct Tweet {
        int userId;
        int tweetId;
        int time;
    };
    int timer = 0;
    vector<Tweet> allTweets;
    unordered_map<int, unordered_set<int>> follows;

public:
    Twitter() {}

    void postTweet(int userId, int tweetId) {
        allTweets.push_back({userId, tweetId, ++timer});
    }

    vector<int> getNewsFeed(int userId) {
        vector<Tweet> feed;
        for (const auto& tw : allTweets) {
            if (tw.userId == userId || follows[userId].count(tw.userId)) {
                feed.push_back(tw);
            }
        }
        sort(feed.begin(), feed.end(), [](const Tweet& a, const Tweet& b) {
            return a.time > b.time;
        });
        vector<int> res;
        for (int i = 0; i < min(10, (int)feed.size()); i++) {
            res.push_back(feed[i].tweetId);
        }
        return res;
    }

    void follow(int followerId, int followeeId) {
        follows[followerId].insert(followeeId);
    }

    void unfollow(int followerId, int followeeId) {
        follows[followerId].erase(followeeId);
    }
};
