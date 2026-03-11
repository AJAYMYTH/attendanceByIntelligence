const supabase = require('../utils/supabase');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { username, password, uid } = req.body;

    try {
        console.log(`Login attempt for username: [${username}], UID: [${uid}]`);
        const { data: user, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            console.log('User not found or query error:', error);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Direct password match (as requested by user, though hashing is recommended)
        if (user.password !== password) {
            console.log('Password mismatch');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // UID matching logic
        if (user.uid !== uid) {
            console.log(`UID mismatch: expected [${user.uid}], received [${uid}]`);
            return res.status(401).json({ message: 'UID mismatch' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, uid: user.uid },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                username: user.username,
                role: user.role,
                uid: user.uid
            }
        });
    } catch (err) {
        console.error('CRITICAL: Login controller exception:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

const generateUID = (role) => {
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    const suffix = role === 'ADMIN' ? 'A' : 'S';
    return `G2TC-AS-${random}-${suffix}`;
};

exports.createUser = async (req, res) => {
    let { username, password, role, uid } = req.body;

    // Auto-generate UID if not provided or doesn't follow format
    if (!uid || !uid.startsWith('G2TC-AS-')) {
        uid = generateUID(role);
    }

    try {
        const { data, error } = await supabase
            .from('app_users')
            .insert([{ username, password, role, uid }])
            .select();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ message: 'Username or UID already exists' });
            throw error;
        }
        res.status(201).json({ message: 'User created successfully', user: data[0] });
    } catch (err) {
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { data, error } = await supabase.from('app_users').select('id, username, role, uid, created_at');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users', error: err.message });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    try {
        const { error } = await supabase.from('app_users').update({ password }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating user', error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('app_users').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user', error: err.message });
    }
};
