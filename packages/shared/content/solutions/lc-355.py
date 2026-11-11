from collections import defaultdict
from typing import List

class Twitter:
    def __init__(self):
        self.clock = 0
        self.tweets = defaultdict(list)
        self.follows = defaultdict(set)

    def postTweet(self, userId: int, tweetId: int) -> None:
        self.tweets[userId].append((self.clock, tweetId))
        self.clock += 1

    def getNewsFeed(self, userId: int) -> List[int]:
        pool = []
        pool.extend(self.tweets[userId][-10:])
        for f in self.follows[userId]:
            pool.extend(self.tweets[f][-10:])
        pool.sort(key=lambda x: x[0], reverse=True)
        return [t[1] for t in pool[:10]]

    def follow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].add(followeeId)

    def unfollow(self, followerId: int, followeeId: int) -> None:
        self.follows[followerId].discard(followeeId)
