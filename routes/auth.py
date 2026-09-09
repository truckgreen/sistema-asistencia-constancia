from flask import Blueprint, redirect, session, url_for


auth_bp = Blueprint('auth', __name__)


@auth_bp.get('/auth/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))
