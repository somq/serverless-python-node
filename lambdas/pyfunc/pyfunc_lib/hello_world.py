from datetime import datetime

def now():
    dt=datetime.now()
    return '{:04d}-{:02d}-{:02d} {:02d}:{:02d}:{:02d}.{:03d}.{:03d}'.format(dt.year,dt.month,dt.day,dt.hour,dt.minute,dt.second,(dt.microsecond//1000),(dt.microsecond%1000))  
