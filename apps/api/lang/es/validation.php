<?php

declare(strict_types=1);

/**
 * Mensajes de validación en español. Laravel usa `lang/{locale}/...`
 * cuando `app.locale = es`.
 */
return [
    'accepted'             => 'El campo :attribute debe ser aceptado.',
    'after'                => 'El campo :attribute debe ser una fecha posterior a :date.',
    'after_or_equal'       => 'El campo :attribute debe ser una fecha posterior o igual a :date.',
    'alpha'                => 'El campo :attribute sólo puede contener letras.',
    'alpha_dash'           => 'El campo :attribute sólo puede contener letras, números, guiones y guiones bajos.',
    'alpha_num'            => 'El campo :attribute sólo puede contener letras y números.',
    'array'                => 'El campo :attribute debe ser un array.',
    'before'                => 'El campo :attribute debe ser una fecha anterior a :date.',
    'between' => [
        'numeric' => 'El campo :attribute debe estar entre :min y :max.',
        'file'    => 'El campo :attribute debe pesar entre :min y :max kilobytes.',
        'string'  => 'El campo :attribute debe tener entre :min y :max caracteres.',
        'array'   => 'El campo :attribute debe contener entre :min y :max elementos.',
    ],
    'boolean'    => 'El campo :attribute debe ser verdadero o falso.',
    'confirmed'  => 'La confirmación de :attribute no coincide.',
    'date'       => 'El campo :attribute debe ser una fecha válida.',
    'email'      => 'El campo :attribute debe ser un correo electrónico válido.',
    'exists'     => 'El :attribute seleccionado no es válido.',
    'image'      => 'El campo :attribute debe ser una imagen.',
    'in'         => 'El :attribute seleccionado no es válido.',
    'integer'    => 'El campo :attribute debe ser un entero.',
    'ip'         => 'El campo :attribute debe ser una IP válida.',
    'json'       => 'El campo :attribute debe ser una cadena JSON válida.',
    'max' => [
        'numeric' => 'El campo :attribute no puede ser mayor a :max.',
        'string'  => 'El campo :attribute no puede tener más de :max caracteres.',
    ],
    'min' => [
        'numeric' => 'El campo :attribute debe ser al menos :min.',
        'string'  => 'El campo :attribute debe tener al menos :min caracteres.',
    ],
    'numeric'    => 'El campo :attribute debe ser un número.',
    'regex'      => 'El formato del campo :attribute no es válido.',
    'required'   => 'El campo :attribute es obligatorio.',
    'required_with' => 'El campo :attribute es obligatorio cuando :values está presente.',
    'required_without' => 'El campo :attribute es obligatorio cuando :values no está presente.',
    'same'       => 'El campo :attribute y :other deben coincidir.',
    'size' => [
        'numeric' => 'El campo :attribute debe ser :size.',
        'string'  => 'El campo :attribute debe tener :size caracteres.',
    ],
    'string'     => 'El campo :attribute debe ser texto.',
    'unique'     => 'El campo :attribute ya está en uso.',
    'url'        => 'El campo :attribute debe ser una URL válida.',
    'uuid'       => 'El campo :attribute debe ser un UUID válido.',

    'attributes' => [
        'email'        => 'correo',
        'password'     => 'contraseña',
        'name'         => 'nombre',
        'phone'        => 'teléfono',
        'starts_at'    => 'fecha y hora',
        'service_id'   => 'servicio',
        'barber_id'    => 'barbero',
        'client_email' => 'correo del cliente',
        'client_name'  => 'nombre del cliente',
        'client_phone' => 'teléfono del cliente',
    ],
];
