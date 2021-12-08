# DynamoDB table settings

# Secondary Global Indexes
A Table to store user notes or messages

- PK (Primary Key): <String> user_id
- SK (Sort Key): <Number> timestamp 

*It's a good practice to have SK (Sort Key) as a <Number> but that is not a requirement*

user_id | timestamp | title | content | cat | note_id | user_name
----

*Global Secondary Indexes:*  
We can add these at anytime  

*Local Secondary Indexes:*  
- Must be added before the table creation.  
- You can't delete the index, so careful consideration is required. 

*What types of Secondary Indexes we can have?:*  
- Indexed on `user_id` and `title` to fetch all the titles of the particular user.
- Indexed on `user_id` and `cat` to fetch the categories of the particular user.

*Tips:*  
1. Because we can't add the *Local Secondary Index* later (after table creation), we have to think ahead and decide what type of queries our application is likely to make in the future. 
2. When designing real world applications, its' very important to spend a considerable amount of time in data modeling before we create our tables.

*Projects Attributes:*
![image](https://user-images.githubusercontent.com/16644017/145145052-b7fbf2bf-807e-465e-b786-29f93fa2215a.png)
For projects attributes we have **All**, **Keys only**, **Include**. They decide which item attribute apart from the `partition and the sort key` we want to store in this particular index. This will also affect the SIZE OF THE INDEX. **We should be choosing this based on what our application would need now and also in the future**
- **All:** You can include more than 20
- **Include:** You can manually specify up to 20 attributes 

**Since we don't have as many attributes as 20**, we will choose **All** attributes.

#### **Global Vs Local** Secondary Index
The difference is in where the index data is stored.
- **Local index:** Then index uses the same partition as that of the table and also shares the RCUs and WCUs allocated to the table. *A local secondary index has the same partition key as its base table, but it has a different sort key.*
- **Global index:** Index will be stored on its own partition, and will have its own RCUs and WCUs separate from the table. This also means you pay more to use the **Global index** which should be fine if your application demands final control or provisioned capacity for this index.  

**In our case**, we will create it as a *Local Secondary Index*.

**We add `note_id`** as our Secondary Global Index, and we don't need a SORT KEY here as it will be a unique value. So, there's nothing to sort because we only have **one item PER partition key.**

Name | Type | Partition Key | Sort Key | Proj.Att
----
title-index | LSI | user_id | title | ALL
cat-index | LSI | user_id | cat | ALL
node_id-index | GSI | note_id | ALL

# Autoscaling
Set it all to be *Disabled*.

# Provisioned Capacity
# | RCUs | WCUs
----
Table | 1 | 1
note_id-index | 1 | 1

This allows us to do: 
- 2 (two) reads per second for EVENTUALLY consistent
- 1 (one) read per second for STRONGLY consistent
- 1 (one) write per second

*This is GOOD ENOUGH for our testing*  
*Global Secondary Index (GSI) does NOT support STRONGLY consistent reads. Only EVENTUALLY consistent.*

WE do see some estimated cost per month. However, as long as we are using **under 25 RCUs and 25 WCUs** in our account, we will remain in the **FREE TIER**.

# Encryption at Rest
We will look at this option, later in the course

