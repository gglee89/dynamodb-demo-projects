# Item Level Operations

`LastEvaluatedKey` is the set of index attributes of the **next item**.We can use this data in a subsequent `query` or `scan` to get the next set of data.  

We must take the data from `LastEvaluatedKey` and pass it as `ExclusiveStartKey` parameter in the subsequent query


