class Twitter:
    def __init__(self):
        self.timer = 0
        self.all_tweets = []  # list of (user_id, tweet_id, time)
        self.follows = {}     # user_id -> set of followee_ids

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.timer += 1
        self.all_tweets.append((userId, tweetId, self.timer))

    def getNewsFeed(self, userId: int) -> list[int]:
        feed = []
        user_follows = self.follows.get(userId, set())
        for u, tw, t in self.all_tweets:
            if u == userId or u in user_follows:
                feed.append((t, tw))
        feed.sort(key=lambda x: x[0], reverse=True)
        return [tw for _, tw in feed[:10]]

    def follow(self, followerId: int, followeeId: int) -> None:
        if followerId not in self.follows:
            self.follows[followerId] = set()
        self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        if followerId in self.follows:
            self.follows[followerId].discard(followeeId)
