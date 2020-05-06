# try:
#   import unzip_requirements
# except ImportError:
#   pass

# # This will import all joke-functions (geek, icanhazdad, chucknorris, icndb)
# # Now you can use them to get some jokes.
from joke.jokes import *


# # Or get a random joke-function.
from random import choice

def main(event, context):
    # joke="test"
    joke=choice([geek, icanhazdad, chucknorris, icndb])()
    print(joke)
    return joke

if __name__ == "__main__":
    main('', '')