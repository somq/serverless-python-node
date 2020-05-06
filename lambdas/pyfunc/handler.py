# try:
#   import unzip_requirements
# except ImportError:
#   pass

from joke.jokes import *
from random import choice
from lambdas.pyfunc.pyfunc_lib import hello_world


def main(event, context):
    joke=choice([geek, icanhazdad, chucknorris, icndb])()
    print(joke)
    print(hello_world.now())
    return { "joke": joke, "now": hello_world.now()}

if __name__ == "__main__":
    main('', '')