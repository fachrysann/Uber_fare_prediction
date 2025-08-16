## 🚖 Project Description

This project focuses on **Uber Inc.**, the world's largest taxi company.  
The main goal is to **predict the fare amount** for future transactions using machine learning models.  
Since Uber serves millions of customers daily, accurate fare estimation is crucial for managing data efficiently,  
enhancing customer experience, and generating valuable business insights.

---

## 📊 Dataset

The dataset (sourced from **Kaggle**) contains the following fields:

- **key** → unique identifier for each trip  
- **fare_amount** → cost of each trip in USD  
- **pickup_datetime** → date and time when the meter was engaged  
- **passenger_count** → number of passengers in the vehicle (driver-entered)  
- **pickup_longitude** → longitude where the meter was engaged  
- **pickup_latitude** → latitude where the meter was engaged  
- **dropoff_longitude** → longitude where the meter was disengaged  
- **dropoff_latitude** → latitude where the meter was disengaged  

---

## 🎯 Objective

1. Understand and clean the dataset (if required).  
2. Build **regression models** to predict Uber ride fares.  
3. Evaluate and compare models using metrics such as **R², RMSE, and MSE**.  

---

<pre>
project/
├── app.py               
├── prepare_input.py     
├── requirement.txt
├── xgb_fare_model.json   
├── static/             
│   ├── style.css        
│   ├── script.js        
│   └── images/          
└── templates/           
    └── index.html   
</pre>
    
<p align="center">
  <img src="Content/demo-web.gif" alt="Detection Example"/>
</p>
